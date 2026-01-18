import * as vscode from 'vscode';
import { SecureApiKeyService } from '@lanonasis/ide-extension-core';
import type { IMemoryService } from '../services/IMemoryService';
import { EnhancedMemoryService } from '../services/EnhancedMemoryService';

/**
 * System diagnostics and health check utilities
 */

export interface DiagnosticResult {
    category: string;
    status: 'success' | 'warning' | 'error' | 'info';
    message: string;
    details?: string;
    action?: string;
}

export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'critical';
    results: DiagnosticResult[];
    timestamp: Date;
}

/**
 * Runs comprehensive system diagnostics
 */
export async function runDiagnostics(
    context: vscode.ExtensionContext,
    secureApiKeyService: SecureApiKeyService,
    memoryService: IMemoryService,
    outputChannel: vscode.OutputChannel
): Promise<SystemHealth> {
    const results: DiagnosticResult[] = [];

    outputChannel.appendLine('==================================================');
    outputChannel.appendLine('Starting Lanonasis Extension Diagnostics');
    outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
    outputChannel.appendLine('==================================================\n');

    // Check 1: Extension Context
    results.push(await checkExtensionContext(context, outputChannel));

    // Check 2: VSCode Version
    results.push(await checkVSCodeVersion(outputChannel));

    // Check 3: Configuration
    results.push(await checkConfiguration(outputChannel));

    // Check 4: Authentication
    results.push(await checkAuthentication(secureApiKeyService, outputChannel));

    // Check 5: Network Connectivity
    results.push(await checkNetworkConnectivity(memoryService, outputChannel));

    // Check 6: Connection Mode (HTTP API)
    results.push(await checkConnectionMode(memoryService, outputChannel));

    // Check 7: Storage
    results.push(await checkStorage(context, outputChannel));

    // Determine overall health
    const overall = determineOverallHealth(results);

    outputChannel.appendLine('\n==================================================');
    outputChannel.appendLine(`Overall Health: ${overall.toUpperCase()}`);
    outputChannel.appendLine('==================================================');

    return {
        overall,
        results,
        timestamp: new Date()
    };
}

async function checkExtensionContext(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
): Promise<DiagnosticResult> {
    outputChannel.appendLine('[1/7] Checking Extension Context...');

    try {
        if (!context) {
            return {
                category: 'Extension Context',
                status: 'error',
                message: 'Extension context is not available',
                action: 'Reload VSCode'
            };
        }

        const globalStoragePath = context.globalStorageUri?.fsPath;
        const workspaceStoragePath = context.storageUri?.fsPath;

        outputChannel.appendLine(`  ✓ Extension ID: ${context.extension.id}`);
        outputChannel.appendLine(`  ✓ Extension Path: ${context.extensionPath}`);
        outputChannel.appendLine(`  ✓ Global Storage: ${globalStoragePath || 'N/A'}`);
        outputChannel.appendLine(`  ✓ Workspace Storage: ${workspaceStoragePath || 'N/A'}`);

        return {
            category: 'Extension Context',
            status: 'success',
            message: 'Extension context is properly initialized'
        };
    } catch (error) {
        outputChannel.appendLine(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
        return {
            category: 'Extension Context',
            status: 'error',
            message: 'Failed to check extension context',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

async function checkVSCodeVersion(outputChannel: vscode.OutputChannel): Promise<DiagnosticResult> {
    outputChannel.appendLine('\n[2/7] Checking VSCode Version...');

    try {
        const version = vscode.version;
        const requiredVersion = '1.74.0';

        outputChannel.appendLine(`  ✓ Current Version: ${version}`);
        outputChannel.appendLine(`  ✓ Required Version: ${requiredVersion}+`);

        // Parse version numbers for comparison
        const [major, minor] = version.split('.').map(Number);
        const [reqMajor, reqMinor] = requiredVersion.split('.').map(Number);

        if (major > reqMajor || (major === reqMajor && minor >= reqMinor)) {
            return {
                category: 'VSCode Version',
                status: 'success',
                message: `VSCode ${version} meets minimum requirements`
            };
        } else {
            return {
                category: 'VSCode Version',
                status: 'warning',
                message: `VSCode ${version} is below recommended version ${requiredVersion}`,
                action: 'Update VSCode'
            };
        }
    } catch (error) {
        outputChannel.appendLine(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
        return {
            category: 'VSCode Version',
            status: 'error',
            message: 'Failed to check VSCode version',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

async function checkConfiguration(outputChannel: vscode.OutputChannel): Promise<DiagnosticResult> {
    outputChannel.appendLine('\n[3/7] Checking Configuration...');

    try {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const apiUrl = config.get<string>('apiUrl');
        const gatewayUrl = config.get<string>('gatewayUrl');
        const useGateway = config.get<boolean>('useGateway');
        const enableMCP = config.get<boolean>('enableMCP');
        const preferCLI = config.get<boolean>('preferCLI');

        outputChannel.appendLine(`  ✓ API URL: ${apiUrl}`);
        outputChannel.appendLine(`  ✓ Gateway URL: ${gatewayUrl}`);
        outputChannel.appendLine(`  ✓ Use Gateway: ${useGateway}`);
        outputChannel.appendLine(`  ✓ Enable MCP: ${enableMCP}`);
        outputChannel.appendLine(`  ✓ Prefer CLI: ${preferCLI}`);

        const issues: string[] = [];

        if (!apiUrl) {
            issues.push('API URL not configured');
        }

        if (useGateway && !gatewayUrl) {
            issues.push('Gateway mode enabled but Gateway URL not configured');
        }

        if (issues.length > 0) {
            return {
                category: 'Configuration',
                status: 'warning',
                message: 'Configuration issues detected',
                details: issues.join('; '),
                action: 'Check Settings'
            };
        }

        return {
            category: 'Configuration',
            status: 'success',
            message: 'Configuration is valid'
        };
    } catch (error) {
        outputChannel.appendLine(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
        return {
            category: 'Configuration',
            status: 'error',
            message: 'Failed to check configuration',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

async function checkAuthentication(
    secureApiKeyService: SecureApiKeyService,
    outputChannel: vscode.OutputChannel
): Promise<DiagnosticResult> {
    outputChannel.appendLine('\n[4/7] Checking Authentication...');

    try {
        const hasApiKey = await secureApiKeyService.hasApiKey();

        if (hasApiKey) {
            outputChannel.appendLine('  ✓ API key is stored securely');

            // Try to retrieve it to verify it's accessible
            try {
                const apiKey = await secureApiKeyService.getApiKey();
                if (apiKey && apiKey.length > 0) {
                    outputChannel.appendLine(`  ✓ API key length: ${apiKey.length} characters`);
                    outputChannel.appendLine(`  ✓ API key prefix: ${apiKey.substring(0, 8)}...`);

                    return {
                        category: 'Authentication',
                        status: 'success',
                        message: 'Authenticated with valid API key'
                    };
                } else {
                    return {
                        category: 'Authentication',
                        status: 'warning',
                        message: 'API key exists but appears empty',
                        action: 'Re-authenticate'
                    };
                }
            } catch (error) {
                return {
                    category: 'Authentication',
                    status: 'warning',
                    message: 'API key exists but could not be retrieved',
                    details: error instanceof Error ? error.message : String(error),
                    action: 'Re-authenticate'
                };
            }
        } else {
            outputChannel.appendLine('  ℹ No API key configured');
            return {
                category: 'Authentication',
                status: 'info',
                message: 'Not authenticated',
                action: 'Authenticate'
            };
        }
    } catch (error) {
        outputChannel.appendLine(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
        return {
            category: 'Authentication',
            status: 'error',
            message: 'Failed to check authentication status',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

async function checkNetworkConnectivity(
    memoryService: IMemoryService,
    outputChannel: vscode.OutputChannel
): Promise<DiagnosticResult> {
    outputChannel.appendLine('\n[5/7] Checking Network Connectivity...');

    try {
        if (!memoryService.isAuthenticated()) {
            outputChannel.appendLine('  ℹ Skipping (not authenticated)');
            return {
                category: 'Network Connectivity',
                status: 'info',
                message: 'Skipped - not authenticated'
            };
        }

        outputChannel.appendLine('  ⏳ Testing connection...');

        const startTime = Date.now();
        await memoryService.testConnection();
        const duration = Date.now() - startTime;

        outputChannel.appendLine(`  ✓ Connection successful (${duration}ms)`);

        return {
            category: 'Network Connectivity',
            status: 'success',
            message: `Connected successfully in ${duration}ms`
        };
    } catch (error) {
        outputChannel.appendLine(`  ✗ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
        return {
            category: 'Network Connectivity',
            status: 'error',
            message: 'Unable to connect to Lanonasis servers',
            details: error instanceof Error ? error.message : String(error),
            action: 'Check internet connection'
        };
    }
}

async function checkConnectionMode(
    memoryService: IMemoryService,
    outputChannel: vscode.OutputChannel
): Promise<DiagnosticResult> {
    outputChannel.appendLine('\n[6/7] Checking Connection Mode...');

    try {
        if (memoryService instanceof EnhancedMemoryService) {
            const capabilities = memoryService.getCapabilities();

            if (capabilities) {
                outputChannel.appendLine(`  ✓ Enhanced Memory Service detected`);
                outputChannel.appendLine(`  ✓ Connection Mode: HTTP API`);
                outputChannel.appendLine(`  ✓ Authenticated: ${capabilities.authenticated}`);

                if (capabilities.authenticated) {
                    return {
                        category: 'Connection Mode',
                        status: 'success',
                        message: 'Connected via HTTP API'
                    };
                } else {
                    return {
                        category: 'Connection Mode',
                        status: 'warning',
                        message: 'HTTP API available but not authenticated',
                        action: 'Configure API key'
                    };
                }
            }
        }

        outputChannel.appendLine('  ℹ Using basic memory service');
        return {
            category: 'Connection Mode',
            status: 'info',
            message: 'Using basic memory service with HTTP API'
        };
    } catch (error) {
        outputChannel.appendLine(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
        return {
            category: 'Connection Mode',
            status: 'warning',
            message: 'Unable to check connection mode',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

async function checkStorage(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
): Promise<DiagnosticResult> {
    outputChannel.appendLine('\n[7/7] Checking Storage...');

    try {
        // Test global state
        await context.globalState.update('lanonasis.diagnosticTest', Date.now());
        const testValue = context.globalState.get('lanonasis.diagnosticTest');

        if (!testValue) {
            outputChannel.appendLine('  ✗ Global state write/read failed');
            return {
                category: 'Storage',
                status: 'error',
                message: 'Storage system is not working properly',
                action: 'Reload VSCode'
            };
        }

        outputChannel.appendLine('  ✓ Global state is accessible');

        // List stored keys (for diagnostics)
        const keys = context.globalState.keys();
        outputChannel.appendLine(`  ✓ Stored keys: ${keys.length}`);

        const firstTime = context.globalState.get('lanonasis.firstTime');
        outputChannel.appendLine(`  ✓ First time flag: ${firstTime}`);

        return {
            category: 'Storage',
            status: 'success',
            message: 'Storage system is working properly'
        };
    } catch (error) {
        outputChannel.appendLine(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
        return {
            category: 'Storage',
            status: 'error',
            message: 'Storage system check failed',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

function determineOverallHealth(results: DiagnosticResult[]): 'healthy' | 'degraded' | 'critical' {
    const hasError = results.some(r => r.status === 'error');
    const hasWarning = results.some(r => r.status === 'warning');

    if (hasError) {
        return 'critical';
    } else if (hasWarning) {
        return 'degraded';
    } else {
        return 'healthy';
    }
}

/**
 * Formats diagnostic results for display
 */
export function formatDiagnosticResults(health: SystemHealth): string {
    const statusEmoji = {
        healthy: '✅',
        degraded: '⚠️',
        critical: '❌'
    };

    const resultEmoji = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };

    let output = `# Lanonasis Extension Diagnostics\n\n`;
    output += `**Overall Health:** ${statusEmoji[health.overall]} ${health.overall.toUpperCase()}\n`;
    output += `**Timestamp:** ${health.timestamp.toLocaleString()}\n\n`;
    output += `---\n\n`;

    for (const result of health.results) {
        output += `## ${resultEmoji[result.status]} ${result.category}\n\n`;
        output += `**Status:** ${result.status.toUpperCase()}\n\n`;
        output += `**Message:** ${result.message}\n\n`;

        if (result.details) {
            output += `**Details:** ${result.details}\n\n`;
        }

        if (result.action) {
            output += `**Recommended Action:** ${result.action}\n\n`;
        }

        output += `---\n\n`;
    }

    return output;
}
