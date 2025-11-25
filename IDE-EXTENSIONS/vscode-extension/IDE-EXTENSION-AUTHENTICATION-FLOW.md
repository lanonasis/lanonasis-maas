# IDE Extension Authentication Flow Analysis

## Summary

**YES, there are TWO separate authentication layers:**

1. **IDE Extension Authentication** - Stored in VS Code SecretStorage
2. **CLI Authentication** - Separate login via `onasis login` or `lanonasis login`

## Authentication Layers

### Layer 1: IDE Extension Authentication

**Location**: `IDE-EXTENSIONS/*/src/auth/AuthenticationService.ts`

**How it works:**
- Stores OAuth tokens in VS Code SecretStorage (`lanonasis.authToken`)
- Falls back to API keys if OAuth token is not available
- Provides `getAuthenticationHeader()` which returns `Bearer <token>`

**Authentication Methods:**
1. **OAuth Token** (preferred)
   - Stored in VS Code SecretStorage
   - Automatically refreshed if refresh_token is available
   - Retrieved via `AuthenticationService.getAuthenticationHeader()`

2. **API Key** (fallback)
   - Stored in VS Code SecretStorage
   - Used when OAuth token is not available or invalid

**Code Reference:**
```typescript
// IDE-EXTENSIONS/cursor-extension/src/auth/AuthenticationService.ts:135-158
async getAuthenticationHeader(): Promise<string | null> {
    // Prefer OAuth token
    if (this.authToken && this.isTokenValid(this.authToken)) {
        return `Bearer ${this.authToken.access_token}`;
    }
    
    // Try to refresh token
    if (this.authToken?.refresh_token) {
        try {
            await this.refreshToken();
            return `Bearer ${this.authToken!.access_token}`;
        } catch (error) {
            console.warn('Token refresh failed:', error);
        }
    }
    
    // Fallback to API key
    const apiKey = await this.getStoredApiKey();
    if (apiKey) {
        return `Bearer ${apiKey}`;
    }
    
    return null;
}
```

### Layer 2: CLI Authentication

**Location**: `packages/memory-client/src/cli-integration.ts`

**How it works:**
- Detects if CLI is available via `onasis --version` or `lanonasis --version`
- Checks authentication status via `onasis auth status` or `lanonasis auth status`
- CLI authentication is **separate** from IDE extension authentication

**Detection Process:**
```typescript
// packages/memory-client/src/cli-integration.ts:152-163
// Check authentication status
let authenticated = false;
try {
    const { stdout: authOutput } = await execAsync(
        'onasis auth status --output json 2>/dev/null || lanonasis auth status --output json 2>/dev/null',
        { timeout: 3000 }
    );
    
    const authStatus = JSON.parse(authOutput);
    authenticated = authStatus.authenticated === true;
} catch {
    // Authentication check failed
}
```

**CLI Authentication Check:**
```typescript
// packages/memory-client/src/cli-integration.ts:187-189
if (!cliInfo.authenticated) {
    return { error: 'CLI not authenticated. Run: onasis login' };
}
```

## How They Work Together

### EnhancedMemoryClient Flow

**Location**: `packages/memory-client/src/enhanced-client.ts`

**Initialization:**
1. Gets token from IDE Extension's `AuthenticationService`
2. Detects CLI capabilities (including authentication status)
3. Routes requests based on capabilities:
   - **If CLI is authenticated**: Routes through CLI (preferred for performance)
   - **If CLI is NOT authenticated**: Falls back to direct API using IDE extension token

**Code Reference:**
```typescript
// IDE-EXTENSIONS/cursor-extension/src/services/EnhancedMemoryService.ts:53-95
private async initializeEnhancedClient(): Promise<void> {
    try {
        // Get authentication from Cursor's OAuth service
        const authHeader = await this.authService.getAuthenticationHeader();
        
        if (!authHeader) {
            this.client = null;
            this.updateStatusBar(false, 'Not Authenticated');
            return;
        }

        // Extract token from Bearer header
        const token = authHeader.replace('Bearer ', '');
        
        // Use Cursor-optimized configuration
        const clientConfig: EnhancedMemoryClientConfig = {
            ...ConfigPresets.ideExtension(token),
            apiUrl: this.baseUrl,
            
            // Cursor-specific optimizations
            preferCLI: Environment.supportsCLI && vscode.workspace.getConfiguration('lanonasis').get<boolean>('preferCLI', true),
            enableMCP: vscode.workspace.getConfiguration('lanonasis').get<boolean>('enableMCP', true),
            cliDetectionTimeout: vscode.workspace.getConfiguration('lanonasis').get<number>('cliDetectionTimeout', 2000),
            verbose: vscode.workspace.getConfiguration('lanonasis').get<boolean>('verboseLogging', false),
            
            // OAuth token for API fallback
            authToken: token
        };

        this.client = new EnhancedMemoryClient(clientConfig);
        
        // Initialize and detect CLI capabilities
        await this.client.initialize();
        this.cliCapabilities = await this.detectCapabilities();
        
        this.updateStatusBar(true, this.getConnectionStatus());
    } catch (error) {
        console.warn('Enhanced Memory Service initialization failed:', error);
        this.client = null;
        this.updateStatusBar(false, 'Initialization Failed');
    }
}
```

## Authentication Scenarios

### Scenario 1: IDE Extension Only (No CLI)
- ✅ **Works**: IDE extension uses its own OAuth token or API key
- ✅ **Memory Services**: Accessible via direct API calls
- ❌ **CLI Features**: Not available (CLI not detected)
- ❌ **MCP Support**: Not available (requires CLI)

### Scenario 2: CLI Only (No IDE Extension Auth)
- ❌ **Works**: IDE extension requires its own authentication
- ❌ **Memory Services**: Not accessible (IDE extension not authenticated)
- ✅ **CLI Features**: Available if CLI is authenticated
- ✅ **MCP Support**: Available if CLI is authenticated

### Scenario 3: Both Authenticated (Recommended)
- ✅ **Works**: Full functionality
- ✅ **Memory Services**: Accessible via CLI (faster) or API fallback
- ✅ **CLI Features**: Full CLI integration available
- ✅ **MCP Support**: Available through CLI

### Scenario 4: IDE Extension Auth, CLI Not Authenticated
- ✅ **Works**: IDE extension uses its own token
- ✅ **Memory Services**: Accessible via direct API (fallback mode)
- ⚠️ **CLI Features**: CLI detected but not authenticated (warning shown)
- ❌ **MCP Support**: Not available (requires authenticated CLI)

## Key Files

1. **IDE Extension Authentication**:
   - `IDE-EXTENSIONS/cursor-extension/src/auth/AuthenticationService.ts`
   - `IDE-EXTENSIONS/windsurf-extension/src/auth/AuthenticationService.ts`
   - `IDE-EXTENSIONS/vscode-extension/src/services/SecureApiKeyService.ts`

2. **CLI Integration**:
   - `packages/memory-client/src/cli-integration.ts`
   - `packages/memory-client/src/enhanced-client.ts`

3. **Memory Service**:
   - `IDE-EXTENSIONS/cursor-extension/src/services/EnhancedMemoryService.ts`
   - `IDE-EXTENSIONS/windsurf-extension/src/services/EnhancedMemoryService.ts`

## Recommendations

1. **For IDE Extension Users**:
   - Authenticate via IDE extension settings (OAuth or API key)
   - This enables basic memory services functionality

2. **For Enhanced Performance**:
   - Also authenticate CLI separately: `onasis login` or `lanonasis login`
   - This enables CLI routing and MCP support for better performance

3. **Best Practice**:
   - Authenticate both layers for full functionality
   - IDE extension auth for basic functionality
   - CLI auth for enhanced features and performance

## Warning Messages

If CLI is detected but not authenticated, the system shows:
```
CLI detected but not authenticated. Run 'onasis login' to enable enhanced SDK features.
```

This is a **warning, not an error** - the IDE extension will still work using direct API calls with its own authentication token.

