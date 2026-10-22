import * as vscode from 'vscode';
import {
  SecureApiKeyService,
  IIDEAdapter,
  AuthStatus
} from '@lanonasis/ide-extension-core';

/**
 * Thin wrapper that maps the legacy AuthenticationService API
 * to the shared SecureApiKeyService + adapter.
 */
export class AuthenticationService {
  private status: AuthStatus = { isAuthenticated: false };

  constructor(
    private adapter: IIDEAdapter,
    private secureAuth: SecureApiKeyService
  ) {}

  async initialize(): Promise<void> {
    await this.secureAuth.initialize();
    this.status = await this.secureAuth.getAuthStatus();
    }

    async checkAuthenticationStatus(): Promise<boolean> {
    this.status = await this.secureAuth.getAuthStatus();
    return this.status.isAuthenticated;
    }

    async authenticateWithBrowser(cancellationToken?: vscode.CancellationToken): Promise<boolean> {
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

    async authenticateWithApiKey(apiKey: string): Promise<boolean> {
    const success = await this.secureAuth.authenticateWithApiKey(apiKey);
    this.status = await this.secureAuth.getAuthStatus();
    return success;
    }

    async logout(): Promise<void> {
    await this.secureAuth.clearCredentials();
    this.status = { isAuthenticated: false };
    }

    async getAuthenticationHeader(): Promise<string | null> {
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

    /**
     * Get the stored credential with its type, so callers can distinguish a
     * custom API key from an OAuth token (issue #59). Returns null when no
     * usable credential is stored.
     */
    async getStoredCredential(): Promise<{ type: 'oauth' | 'apiKey'; token: string } | null> {
      try {
        const credential = await this.secureAuth.getStoredCredentials();
        if (credential?.token?.trim()) {
          return { type: credential.type, token: credential.token };
        }
        return null;
      } catch {
        return null;
      }
    }

    isAuthenticated(): boolean {
    return this.status.isAuthenticated;
            }
}
