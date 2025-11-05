import * as vscode from 'vscode';
import { AuthenticationService } from '../auth/AuthenticationService';

/**
 * Secure API Key + OAuth helper for the VS Code extension.
 * Delegates credential storage to the shared AuthenticationService so
 * that the VS Code extension stays in sync with Cursor/Windsurf.
 */
export class SecureApiKeyService {
    private readonly authService: AuthenticationService;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.authService = new AuthenticationService(context);
        this.outputChannel = outputChannel;
    }

    async initialize(): Promise<void> {
        await this.migrateLegacyConfiguration();
        await this.authService.checkAuthenticationStatus();
    }

    async getApiKeyOrPrompt(): Promise<string | null> {
        const apiKey = await this.getApiKey();
        if (apiKey) {
            return apiKey;
        }

        await this.promptForAuthentication();
        return await this.getApiKey();
    }

    async getApiKey(): Promise<string | null> {
        return this.authService.getStoredApiKey();
    }

    async hasApiKey(): Promise<boolean> {
        const apiKey = await this.getApiKey();
        if (apiKey) {
            return true;
        }

        const authHeader = await this.getAuthenticationHeader();
        return authHeader !== null;
    }

    async promptForAuthentication(): Promise<string | null> {
        const choice = await vscode.window.showQuickPick([
            {
                label: '$(key) OAuth (Browser)',
                description: 'Authenticate using OAuth2 with browser (Recommended)',
                value: 'oauth'
            },
            {
                label: '$(key) API Key',
                description: 'Enter API key directly',
                value: 'apikey'
            },
            {
                label: '$(circle-slash) Cancel',
                description: 'Cancel authentication',
                value: 'cancel'
            }
        ], {
            placeHolder: 'Choose authentication method'
        });

        if (!choice || choice.value === 'cancel') {
            return null;
        }

        if (choice.value === 'oauth') {
            const cancellationToken = new vscode.CancellationTokenSource();

            try {
                await this.authService.authenticateWithBrowser(cancellationToken.token);
                vscode.window.showInformationMessage('Lanonasis authentication successful.');
                return await this.getApiKey();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`OAuth authentication failed: ${message}`);
                this.outputChannel.appendLine(`[OAuth] Error: ${message}`);
            } finally {
                cancellationToken.dispose();
            }
        } else if (choice.value === 'apikey') {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Lanonasis API Key',
                placeHolder: 'Get your API key from the dashboard',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'API key is required';
                    }
                    if (!value.startsWith('pk_') && value.length < 20) {
                        return 'API key seems invalid';
                    }
                    return null;
                }
            });

            if (apiKey) {
                try {
                    await this.authService.authenticateWithApiKey(apiKey);
                    vscode.window.showInformationMessage('API key stored securely.');
                    return apiKey;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(message);
                    this.outputChannel.appendLine(`[ApiKey] Validation failed: ${message}`);
                }
            }
        }

        return null;
    }

    async deleteApiKey(): Promise<void> {
        await this.authService.clearStoredApiKey();
        this.outputChannel.appendLine('[SecureApiKeyService] API key cleared from secure storage');
    }

    async getAuthenticationHeader(): Promise<string | null> {
        return this.authService.getAuthenticationHeader();
    }

    async logout(): Promise<void> {
        await this.authService.logout();
    }

    private async migrateLegacyConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const legacyKey = config.get<string>('apiKey');

        if (legacyKey && legacyKey.trim().length > 0) {
            try {
                await this.authService.authenticateWithApiKey(legacyKey.trim());
                await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
                this.outputChannel.appendLine('[SecureApiKeyService] Migrated API key from settings to secure storage.');
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.outputChannel.appendLine(`[SecureApiKeyService] Migration failed: ${message}`);
            }
        }
    }
}
