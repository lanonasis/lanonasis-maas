import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { jwtDecode } from 'jwt-decode';
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
        catch (error) {
            // Config doesn't exist yet, that's ok
        }
    }
    async load() {
        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(data);
        }
        catch (error) {
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
            'http://localhost:3000/api/v1';
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
                email: decoded.email || '',
                organization_id: decoded.organizationId || '',
                role: decoded.role || '',
                plan: decoded.plan || ''
            };
        }
        catch (error) {
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
            return decoded.exp > now;
        }
        catch (error) {
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
}
