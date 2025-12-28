"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
/**
 * Thin wrapper that maps the legacy AuthenticationService API
 * to the shared SecureApiKeyService + adapter.
 */
class AuthenticationService {
    constructor(adapter, secureAuth) {
        this.adapter = adapter;
        this.secureAuth = secureAuth;
        this.status = { authenticated: false, method: 'unknown' };
    }
    async initialize() {
        await this.secureAuth.initialize();
        this.status = await this.secureAuth.getAuthStatus();
    }
    async checkAuthenticationStatus() {
        this.status = await this.secureAuth.getAuthStatus();
        return this.status.authenticated;
    }
    async authenticateWithBrowser(cancellationToken) {
        const authPromise = this.secureAuth.authenticateWithOAuth();
        if (cancellationToken) {
            cancellationToken.onCancellationRequested(() => {
                this.secureAuth.clearCredentials().catch(() => undefined);
            });
        }
        const success = await authPromise;
        this.status = await this.secureAuth.getAuthStatus();
        return success;
    }
    async authenticateWithApiKey(apiKey) {
        const success = await this.secureAuth.authenticateWithApiKey(apiKey);
        this.status = await this.secureAuth.getAuthStatus();
        return success;
    }
    async logout() {
        await this.secureAuth.clearCredentials();
        this.status = { authenticated: false, method: 'unknown' };
    }
    async getAuthenticationHeader() {
        const credentials = await this.secureAuth.getStoredCredentials();
        if (credentials?.token) {
            return `Bearer ${credentials.token}`;
        }
        const apiKey = await this.secureAuth.getApiKey();
        if (apiKey) {
            return `Bearer ${apiKey}`;
        }
        return null;
    }
    isAuthenticated() {
        return this.status.authenticated;
    }
}
exports.AuthenticationService = AuthenticationService;
//# sourceMappingURL=AuthenticationService.js.map