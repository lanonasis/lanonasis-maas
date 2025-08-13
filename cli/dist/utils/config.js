import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { jwtDecode } from 'jwt-decode';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class CLIConfig {
    configDir;
    configPath;
    config = {};
    constructor() {
        this.configDir = path.join(os.homedir(), '.maas');
        this.configPath = path.join(this.configDir, 'config.json');
    }
    async init() {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
            await this.load();
        }
        catch {
            // Config doesn't exist yet, that's ok
        }
    }
    async load() {
        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(data);
        }
        catch {
            this.config = {};
        }
    }
    async save() {
        await fs.mkdir(this.configDir, { recursive: true });
        this.config.lastUpdated = new Date().toISOString();
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    }
    getApiUrl() {
        return process.env.MEMORY_API_URL ||
            this.config.apiUrl ||
            'https://dashboard.lanonasis.com/api/v1';
    }
    async setApiUrl(url) {
        this.config.apiUrl = url;
        await this.save();
    }
    async setToken(token) {
        this.config.token = token;
        // Decode token to get user info
        try {
            const decoded = jwtDecode(token);
            // We'll need to fetch full user details from the API
            // For now, store what we can decode
            this.config.user = {
                email: String(decoded.email || ''),
                organization_id: String(decoded.organizationId || ''),
                role: String(decoded.role || ''),
                plan: String(decoded.plan || '')
            };
        }
        catch {
            // Invalid token, don't store user info
        }
        await this.save();
    }
    getToken() {
        return this.config.token;
    }
    async getCurrentUser() {
        return this.config.user;
    }
    async isAuthenticated() {
        const token = this.getToken();
        if (!token)
            return false;
        try {
            const decoded = jwtDecode(token);
            const now = Date.now() / 1000;
            return typeof decoded.exp === 'number' && decoded.exp > now;
        }
        catch {
            return false;
        }
    }
    async logout() {
        this.config.token = undefined;
        this.config.user = undefined;
        await this.save();
    }
    async clear() {
        this.config = {};
        await this.save();
    }
    getConfigPath() {
        return this.configPath;
    }
    async exists() {
        try {
            await fs.access(this.configPath);
            return true;
        }
        catch {
            return false;
        }
    }
    // Generic get/set methods for MCP and other dynamic config
    get(key) {
        return this.config[key];
    }
    set(key, value) {
        this.config[key] = value;
    }
    async setAndSave(key, value) {
        this.set(key, value);
        await this.save();
    }
    // MCP-specific helpers
    getMCPServerPath() {
        return this.config.mcpServerPath || path.join(__dirname, '../../../../onasis-gateway/mcp-server/server.js');
    }
    getMCPServerUrl() {
        return this.config.mcpServerUrl || 'https://dashboard.lanonasis.com';
    }
    shouldUseRemoteMCP() {
        const preference = this.config.mcpPreference || 'auto';
        switch (preference) {
            case 'remote':
                return true;
            case 'local':
                return false;
            case 'auto':
            default:
                // Use remote if authenticated, otherwise local
                return !!this.config.token;
        }
    }
}
