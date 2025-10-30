#!/usr/bin/env node
/**
 * WebSocket Connection Diagnostic Tool
 * 
 * This script tests the WebSocket connection to the MCP server
 * and diagnoses header upgrade issues without affecting production.
 */

import WebSocket from 'ws';
import chalk from 'chalk';
import { setTimeout, clearTimeout } from 'timers';

interface ConnectionTest {
    url: string;
    name: string;
    headers?: Record<string, string>;
}

const connectionTests: ConnectionTest[] = [
    {
        name: 'Direct VPS WebSocket (port 3002)',
        url: 'wss://168.231.74.29:3002/ws',
    },
    {
        name: 'Domain WebSocket (nginx proxy)',
        url: 'wss://mcp.lanonasis.com/ws',
    },
    {
        name: 'WebSocket with MCP headers',
        url: 'wss://mcp.lanonasis.com/ws',
        headers: {
            'Sec-WebSocket-Protocol': 'mcp',
            'User-Agent': 'LanonasisMCP/1.0',
        }
    },
    {
        name: 'WebSocket with explicit upgrade',
        url: 'wss://mcp.lanonasis.com/ws',
        headers: {
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Sec-WebSocket-Version': '13',
        }
    }
];

async function testWebSocketConnection(test: ConnectionTest): Promise<void> {
    console.log(chalk.blue(`\n🔍 Testing: ${test.name}`));
    console.log(chalk.gray(`   URL: ${test.url}`));

    if (test.headers) {
        console.log(chalk.gray(`   Headers:`, JSON.stringify(test.headers, null, 2)));
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.log(chalk.red(`   ❌ Connection timeout (10s)`));
            ws.terminate();
            reject(new Error('Connection timeout'));
        }, 10000);

        const ws = new WebSocket(test.url, {
            headers: test.headers,
            handshakeTimeout: 10000,
        });

        ws.on('open', () => {
            clearTimeout(timeout);
            console.log(chalk.green(`   ✅ Connection established`));

            // Send a test MCP message
            const testMessage = {
                jsonrpc: '2.0',
                method: 'server/info',
                id: 1
            };

            console.log(chalk.gray(`   📤 Sending test message:`, JSON.stringify(testMessage)));
            ws.send(JSON.stringify(testMessage));

            // Wait for response or timeout
            setTimeout(() => {
                console.log(chalk.yellow(`   ⏰ No response received in 5s, closing connection`));
                ws.close();
                resolve();
            }, 5000);
        });

        ws.on('message', (data) => {
            clearTimeout(timeout);
            try {
                const message = JSON.parse(data.toString());
                console.log(chalk.green(`   📨 Received response:`, JSON.stringify(message, null, 2)));
                ws.close();
                resolve();
            } catch {
                console.log(chalk.yellow(`   📨 Received raw message:`, data.toString()));
                ws.close();
                resolve();
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log(chalk.red(`   ❌ WebSocket error:`), error.message);

            // Analyze specific error types
            if (error.message.includes('403')) {
                console.log(chalk.yellow(`   💡 Suggestion: Check nginx configuration for WebSocket upgrade handling`));
            } else if (error.message.includes('404')) {
                console.log(chalk.yellow(`   💡 Suggestion: Verify WebSocket endpoint exists on port 3002`));
            } else if (error.message.includes('timeout')) {
                console.log(chalk.yellow(`   💡 Suggestion: Check if MCP server is running and responsive`));
            } else if (error.message.includes('ECONNREFUSED')) {
                console.log(chalk.yellow(`   💡 Suggestion: Verify service is running on target port`));
            }

            reject(error);
        });

        ws.on('close', (code, reason) => {
            clearTimeout(timeout);
            console.log(chalk.gray(`   🔌 Connection closed: Code ${code}, Reason: ${reason || 'None'}`));
            resolve();
        });
    });
}

async function runDiagnostics() {
    console.log(chalk.bold.blue('\n🔧 MCP WebSocket Connection Diagnostics\n'));
    console.log(chalk.gray('This tool will test WebSocket connections to identify header upgrade issues.\n'));

    for (const test of connectionTests) {
        try {
            await testWebSocketConnection(test);
        } catch {
            // Continue with next test
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests
    }

    console.log(chalk.bold.green('\n✅ Diagnostics complete!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray('1. Review nginx WebSocket proxy configuration'));
    console.log(chalk.gray('2. Check MCP server WebSocket handler implementation'));
    console.log(chalk.gray('3. Verify PM2 process is running and healthy'));
    console.log(chalk.gray('4. Test with curl for HTTP upgrade headers\n'));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Diagnostic interrupted by user'));
    process.exit(0);
});

process.on('unhandledRejection', (reason, _promise) => {
    console.error(chalk.red('Unhandled rejection:'), reason);
});

// Run diagnostics
runDiagnostics().catch(error => {
    console.error(chalk.red('\n❌ Diagnostic failed:'), error);
    process.exit(1);
});