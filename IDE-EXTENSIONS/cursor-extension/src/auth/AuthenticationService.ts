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
  private status: AuthStatus = { authenticated: false, method: 'unknown' };

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
    return this.status.authenticated;
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
    this.status = { authenticated: false, method: 'unknown' };
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

  isAuthenticated(): boolean {
    return this.status.authenticated;
  }
}
