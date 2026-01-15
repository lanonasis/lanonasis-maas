# VS Code Extension Backend Infrastructure Documentation

**Complete End-to-End Architecture Guide**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Extension Activation Flow](#extension-activation-flow)
3. [Service Layer Architecture](#service-layer-architecture)
4. [Authentication System](#authentication-system)
5. [Webview Communication](#webview-communication)
6. [Message Passing Protocol](#message-passing-protocol)
7. [Type System](#type-system)
8. [Utility Functions](#utility-functions)
9. [Integration Points](#integration-points)
10. [Code Patterns & Examples](#code-patterns--examples)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Extension Activation (extension.ts)                │  │
│  │  - Initializes all services                          │  │
│  │  - Registers providers & commands                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│        ┌─────────────────┼─────────────────┐               │
│        │                 │                 │               │
│  ┌─────▼─────┐   ┌──────▼──────┐   ┌─────▼─────┐         │
│  │  Services  │   │  Providers   │   │  Panels    │         │
│  │  Layer     │   │  Layer       │   │  Layer     │         │
│  └────────────┘   └──────────────┘   └────────────┘         │
│        │                 │                 │               │
│        └─────────────────┼─────────────────┘               │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────┐     │
│  │         SecureApiKeyService (Core)                 │     │
│  │  - VS Code SecretStorage                           │     │
│  │  - OAuth2 PKCE Flow                                │     │
│  │  - API Key Management                              │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              External Services                              │
│  - Memory API (mcp.lanonasis.com)                          │
│  - OAuth Gateway (auth.lanonasis.com)                      │
│  - SDK Packages (@lanonasis/memory-client)                │
└─────────────────────────────────────────────────────────────┘
```

### Component Layers

1. **Extension Host Layer** (`extension.ts`)
   - Entry point and orchestration
   - Service initialization
   - Command registration

2. **Service Layer** (`services/`)
   - `SecureApiKeyService` - Authentication & credential management
   - `MemoryService` / `EnhancedMemoryService` - Memory operations
   - `ApiKeyService` - API key CRUD operations

3. **Provider Layer** (`providers/`)
   - `MemoryTreeProvider` - Sidebar tree view
   - `ApiKeyTreeProvider` - API keys tree view
   - `MemoryCompletionProvider` - Code completion

4. **Panel Layer** (`panels/`)
   - `MemorySidebarProvider` - Original UI
   - `EnhancedSidebarProvider` - React-based UI

5. **Bridge Layer** (`bridges/`)
   - `PrototypeUIBridge` - Adapts service layer to UI needs

---

## Extension Activation Flow

### Entry Point: `src/extension.ts`

```typescript
export async function activate(context: vscode.ExtensionContext) {
    // 1. Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Lanonasis');

    // 2. Initialize SecureApiKeyService (CRITICAL - must be first)
    const secureApiKeyService = new SecureApiKeyService(context, outputChannel);
    await secureApiKeyService.initialize(); // Migrates legacy configs

    // 3. Initialize Memory Service (with fallback)
    let memoryService: IMemoryService;
    try {
        memoryService = new EnhancedMemoryService(secureApiKeyService);
        console.log('Using Enhanced Memory Service with CLI integration');
    } catch (error) {
        console.warn('Enhanced Memory Service not available, using basic service:', error);
        memoryService = new MemoryService(secureApiKeyService);
    }

    // 4. Initialize API Key Service
    const apiKeyService = new ApiKeyService(secureApiKeyService);

    // 5. Register UI Providers (feature flag based)
    const configuration = vscode.workspace.getConfiguration('lanonasis');
    const useEnhancedUI = configuration.get<boolean>('useEnhancedUI', false);
    
    let sidebarProvider: MemorySidebarProvider | EnhancedSidebarProvider;
    if (useEnhancedUI) {
        sidebarProvider = new EnhancedSidebarProvider(
            context.extensionUri, 
            memoryService, 
            apiKeyService
        );
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                EnhancedSidebarProvider.viewType,
                sidebarProvider
            )
        );
    } else {
        sidebarProvider = new MemorySidebarProvider(
            context.extensionUri, 
            memoryService
        );
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                MemorySidebarProvider.viewType,
                sidebarProvider
            )
        );
    }

    // 6. Register Tree Providers
    const memoryTreeProvider = new MemoryTreeProvider(memoryService);
    const apiKeyTreeProvider = new ApiKeyTreeProvider(apiKeyService);
    
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider),
        vscode.window.registerTreeDataProvider('lanonasisApiKeys', apiKeyTreeProvider)
    );

    // 7. Register Completion Provider
    const completionProvider = new MemoryCompletionProvider(memoryService);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            completionProvider,
            '@', '#', '//' // Trigger characters
        )
    );

    // 8. Set Context Variables
    await vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);
    await vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', false);

    // 9. Register Commands (see Commands section)
    const commands = [/* ... */];
    context.subscriptions.push(...commands);

    // 10. Check Authentication Status
    const hasStoredKey = await secureApiKeyService.hasApiKey();
    if (hasStoredKey) {
        await handleAuthenticationSuccess();
    } else {
        await applyAuthenticationState(false);
    }
}
```

### Activation Sequence Diagram

```
Extension Activation
    │
    ├─► Create OutputChannel
    │
    ├─► Initialize SecureApiKeyService
    │   ├─► Migrate legacy configs
    │   └─► Load stored credentials
    │
    ├─► Initialize MemoryService
    │   ├─► Try EnhancedMemoryService (CLI)
    │   └─► Fallback to MemoryService
    │
    ├─► Initialize ApiKeyService
    │
    ├─► Register UI Providers
    │   ├─► EnhancedSidebarProvider (if flag enabled)
    │   └─► MemorySidebarProvider (fallback)
    │
    ├─► Register Tree Providers
    │   ├─► MemoryTreeProvider
    │   └─► ApiKeyTreeProvider
    │
    ├─► Register Completion Provider
    │
    ├─► Register Commands
    │
    └─► Check Authentication
        ├─► If authenticated: Refresh services
        └─► If not: Show welcome/prompt
```

---

## Service Layer Architecture

### 1. SecureApiKeyService

**Purpose**: Central authentication and credential management using VS Code SecretStorage.

**Location**: `src/services/SecureApiKeyService.ts`

**Key Responsibilities**:
- OAuth2 PKCE flow implementation
- API key storage/retrieval (SHA-256 hashed)
- Credential type management (OAuth vs API Key)
- Legacy config migration

**Storage Keys**:
```typescript
private static readonly API_KEY_KEY = 'lanonasis.apiKey';           // SHA-256 hash
private static readonly AUTH_TOKEN_KEY = 'lanonasis.authToken';     // OAuth token JSON
private static readonly REFRESH_TOKEN_KEY = 'lanonasis.refreshToken'; // Refresh token
private static readonly CREDENTIAL_TYPE_KEY = 'lanonasis.credentialType'; // 'oauth' | 'apiKey'
```

**Core Methods**:

```typescript
export class SecureApiKeyService {
    // Initialization
    async initialize(): Promise<void>
    
    // API Key Management
    async getApiKey(): Promise<string | null>
    async getApiKeyOrPrompt(): Promise<string | null>
    async hasApiKey(): Promise<boolean>
    async storeApiKey(apiKey: string): Promise<void>
    async deleteApiKey(): Promise<void>
    
    // OAuth Flow
    async authenticateWithOAuthFlow(): Promise<string | null>
    async authenticateOAuth(): Promise<boolean>
    async promptForApiKeyEntry(): Promise<string | null>
    
    // Credential Resolution
    async getStoredCredentials(): Promise<StoredCredential | null>
    async getAuthenticationHeader(): Promise<string | null>
    
    // Migration
    private async migrateFromConfigIfNeeded(): Promise<void>
}
```

**OAuth2 PKCE Flow Implementation**:

```typescript
async authenticateOAuth(): Promise<boolean> {
    // 1. Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier(); // 32 bytes → base64url
    const codeChallenge = this.generateCodeChallenge(codeVerifier); // SHA256 hash
    const state = this.generateState(); // CSRF protection
    
    // 2. Store verifier in memory (temporary)
    this.tempCodeVerifier = codeVerifier;
    this.tempState = state;
    
    // 3. Build authorization URL
    const authUrl = new URL('/oauth/authorize', authBaseUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', `http://localhost:${CALLBACK_PORT}/callback`);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'read write');
    
    // 4. Open browser
    await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));
    
    // 5. Start local HTTP server to receive callback
    const server = http.createServer(async (req, res) => {
        if (req.url?.startsWith('/callback')) {
            const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            
            // Verify state
            if (state !== this.tempState) {
                res.writeHead(400);
                res.end('Invalid state parameter');
                return;
            }
            
            // Exchange code for token
            const tokenResponse = await fetch(`${authBaseUrl}/oauth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code!,
                    redirect_uri: `http://localhost:${CALLBACK_PORT}/callback`,
                    client_id: clientId,
                    code_verifier: this.tempCodeVerifier!
                })
            });
            
            const tokens = await tokenResponse.json();
            
            // Store tokens
            await this.context.secrets.store(AUTH_TOKEN_KEY, JSON.stringify({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in
            }));
            
            await this.context.secrets.store(CREDENTIAL_TYPE_KEY, 'oauth');
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body>Authentication successful! You can close this window.</body></html>');
            
            server.close();
        }
    });
    
    server.listen(CALLBACK_PORT);
    
    // Wait for callback (with timeout)
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            server.close();
            resolve(false);
        }, 300000); // 5 minutes
        
        server.on('close', () => {
            clearTimeout(timeout);
            resolve(true);
        });
    });
}
```

**API Key Hashing**:

```typescript
// Uses SHA-256 hashing for security
import { hashApiKey, ensureApiKeyHash } from '../utils/hash-utils';

async storeApiKey(apiKey: string): Promise<void> {
    // Hash before storage (prevents plaintext storage)
    const hashed = ensureApiKeyHash(apiKey);
    await this.context.secrets.store(API_KEY_KEY, hashed);
    await this.context.secrets.store(CREDENTIAL_TYPE_KEY, 'apiKey');
}
```

### 2. MemoryService / EnhancedMemoryService

**Purpose**: Memory CRUD operations and semantic search.

**Location**: 
- `src/services/MemoryService.ts` (Basic)
- `src/services/EnhancedMemoryService.ts` (CLI-enhanced)

**Interface**: `src/services/IMemoryService.ts`

```typescript
export interface IMemoryService {
    isAuthenticated(): boolean;
    testConnection(apiKey?: string): Promise<void>;
    createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry>;
    searchMemories(query: string, options?: Partial<SearchMemoryRequest>): Promise<MemorySearchResult[]>;
    getMemory(id: string): Promise<MemoryEntry>;
    listMemories(limit?: number): Promise<MemoryEntry[]>;
    deleteMemory(id: string): Promise<void>;
    getMemoryStats(): Promise<UserMemoryStats>;
    refreshClient(): Promise<void>;
}
```

**Implementation Pattern**:

```typescript
export class MemoryService implements IMemoryService {
    private client: MaaSClient | null = null;
    private secureApiKeyService: SecureApiKeyService;
    
    constructor(secureApiKeyService: SecureApiKeyService) {
        this.secureApiKeyService = secureApiKeyService;
    }
    
    private async ensureClient(): Promise<void> {
        if (this.client) return;
        
        const authHeader = await this.secureApiKeyService.getAuthenticationHeader();
        if (!authHeader) {
            throw new Error('Not authenticated');
        }
        
        const config = vscode.workspace.getConfiguration('lanonasis');
        const baseUrl = config.get<string>('apiUrl', 'https://mcp.lanonasis.com');
        
        this.client = new MaaSClient({
            baseUrl,
            authHeader
        });
    }
    
    async createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry> {
        await this.ensureClient();
        if (!this.client) throw new Error('Not authenticated');
        
        const response = await this.client.createMemory(memory);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Create failed');
        }
        
        return response.data;
    }
    
    async searchMemories(query: string, options: Partial<SearchMemoryRequest> = {}): Promise<MemorySearchResult[]> {
        await this.ensureClient();
        if (!this.client) throw new Error('Not authenticated');
        
        const searchRequest: SearchMemoryRequest = {
            query,
            limit: 20,
            threshold: 0.7,
            status: 'active',
            ...options
        };
        
        const response = await this.client.searchMemories(searchRequest);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Search failed');
        }
        
        return response.data.results;
    }
}
```

**EnhancedMemoryService** (CLI Integration):

```typescript
export class EnhancedMemoryService implements IEnhancedMemoryService {
    private client: EnhancedMemoryClientType | null = null;
    private capabilities: MemoryServiceCapabilities | null = null;
    
    // Uses @lanonasis/memory-client SDK
    // Detects CLI availability via `onasis --version`
    // Falls back to HTTP API if CLI unavailable
    
    async refreshClient(): Promise<void> {
        // Check CLI availability
        const cliAvailable = await this.checkCLIAvailability();
        
        if (cliAvailable) {
            // Use CLI-based client
            this.client = new MemoryClientCLI();
        } else {
            // Use HTTP-based client
            this.client = new MemoryClientHTTP();
        }
        
        this.capabilities = {
            cliAvailable,
            mcpSupport: cliAvailable,
            authenticated: await this.isAuthenticated(),
            goldenContract: false
        };
    }
}
```

### 3. ApiKeyService

**Purpose**: Scoped API key management (project-level keys).

**Location**: `src/services/ApiKeyService.ts`

**Key Features**:
- Project management
- Scoped API key CRUD
- Key rotation
- Environment-based keys (dev/staging/prod)

**Core Methods**:

```typescript
export class ApiKeyService {
    private secureApiKeyService: SecureApiKeyService;
    private baseUrl: string;
    
    // Project Management
    async getProjects(): Promise<Project[]>
    async createProject(request: CreateProjectRequest): Promise<Project>
    async deleteProject(projectId: string): Promise<void>
    
    // API Key Management
    async getApiKeys(projectId?: string): Promise<ApiKey[]>
    async createApiKey(request: CreateApiKeyRequest): Promise<ApiKey>
    async deleteApiKey(keyId: string): Promise<void>
    async rotateApiKey(keyId: string): Promise<ApiKey>
    
    // Authentication
    private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T>
    private async resolveCredentials(): Promise<StoredCredential>
}
```

**Request Pattern**:

```typescript
private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 1. Resolve credentials (OAuth token or API key)
    const credentials = await this.resolveCredentials();
    
    // 2. Build URL
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;
    
    // 3. Set auth headers
    const authHeaders: Record<string, string> = credentials.type === 'oauth'
        ? { 'Authorization': `Bearer ${credentials.token}` }
        : { 'X-API-Key': credentials.token };
    
    // 4. Make request
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
}
```

---

## Authentication System

### Authentication Flow Diagram

```
User Action
    │
    ├─► OAuth Flow
    │   │
    │   ├─► Generate PKCE parameters
    │   ├─► Open browser → auth.lanonasis.com
    │   ├─► User authorizes
    │   ├─► Callback to localhost:8080
    │   ├─► Exchange code for token
    │   └─► Store in SecretStorage
    │
    └─► API Key Flow
        │
        ├─► Prompt for API key
        ├─► Hash with SHA-256
        └─► Store in SecretStorage
```

### Credential Resolution

```typescript
// Priority: OAuth Token > API Key
async getAuthenticationHeader(): Promise<string | null> {
    // 1. Try OAuth token
    const authToken = await this.context.secrets.get(AUTH_TOKEN_KEY);
    if (authToken) {
        const token = JSON.parse(authToken);
        if (this.isTokenValid(token)) {
            return `Bearer ${token.access_token}`;
        }
        
        // Try refresh
        if (token.refresh_token) {
            try {
                await this.refreshToken();
                const refreshed = await this.context.secrets.get(AUTH_TOKEN_KEY);
                if (refreshed) {
                    return `Bearer ${JSON.parse(refreshed).access_token}`;
                }
            } catch (error) {
                // Refresh failed, fall through to API key
            }
        }
    }
    
    // 2. Fallback to API key
    const apiKey = await this.getApiKey();
    if (apiKey) {
        // Note: API key is stored as hash, but we need the original
        // This is a limitation - we can't retrieve original from hash
        // In practice, OAuth is preferred for this reason
        return null; // Would need original key
    }
    
    return null;
}
```

### OAuth Token Refresh

```typescript
private async refreshToken(): Promise<void> {
    const refreshToken = await this.context.secrets.get(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }
    
    const response = await fetch(`${authBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId
        })
    });
    
    if (!response.ok) {
        throw new Error('Token refresh failed');
    }
    
    const tokens = await response.json();
    
    await this.context.secrets.store(AUTH_TOKEN_KEY, JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken,
        expires_in: tokens.expires_in
    }));
}
```

---

## Webview Communication

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  VS Code Extension Host (Node.js)                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │  EnhancedSidebarProvider                          │ │
│  │  - Handles webview lifecycle                      │ │
│  │  - Manages message passing                        │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                    │
                    │ postMessage / onDidReceiveMessage
                    │
┌───────────────────▼─────────────────────────────────────┐
│  Webview (Browser Context)                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │  React App (App.tsx)                             │ │
│  │  - IDEPanel component                            │ │
│  │  - useAuth, useMemories hooks                    │ │
│  │  - window.vscode.postMessage()                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Webview Initialization

**Provider Side** (`EnhancedSidebarProvider.ts`):

```typescript
public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
) {
    this._view = webviewView;
    
    // Configure webview
    webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
            vscode.Uri.joinPath(this._extensionUri, 'media'),
            vscode.Uri.joinPath(this._extensionUri, 'out'),
            vscode.Uri.joinPath(this._extensionUri, 'images')
        ]
    };
    
    // Set HTML content
    webviewView.webview.html = this._getReactHtmlForWebview(webviewView.webview);
    
    // Listen for messages from webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
        await this.handleWebviewMessage(data);
    });
    
    // Send initial data
    this.sendInitialData();
}

private _getReactHtmlForWebview(webview: vscode.Webview) {
    const reactScriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar-react.js')
    );
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'media', 'react-styles.css')
    );
    const nonce = this.getNonce();
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" 
              content="default-src 'none'; 
                       style-src ${webview.cspSource}; 
                       script-src 'nonce-${nonce}'; 
                       img-src ${webview.cspSource} https:; 
                       font-src ${webview.cspSource};">
        <link href="${styleUri}" rel="stylesheet">
    </head>
    <body>
        <div id="root"></div>
        <script nonce="${nonce}">
            // Initialize VS Code API BEFORE React loads
            (function() {
                const vscode = acquireVsCodeApi();
                window.vscode = vscode;
            })();
        </script>
        <script nonce="${nonce}" src="${reactScriptUri}"></script>
    </body>
    </html>`;
}
```

**Webview Side** (`src/react/index.tsx`):

```typescript
// Declare VS Code API types
declare function acquireVsCodeApi(): {
    postMessage: (message: { type: string; data?: unknown }) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
};

declare global {
    interface Window {
        vscode: {
            postMessage: (message: { type: string; data?: unknown }) => void;
            getState: () => unknown;
            setState: (state: unknown) => void;
        };
    }
}

// Initialize React app
const initReactApp = () => {
    const container = document.getElementById('root');
    if (container) {
        // Ensure window.vscode is initialized
        if (typeof window.vscode === 'undefined') {
            window.vscode = acquireVsCodeApi();
        }
        const root = createRoot(container);
        root.render(<App />);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReactApp);
} else {
    initReactApp();
}
```

---

## Message Passing Protocol

### Message Types

**From Webview → Extension**:

```typescript
// Authentication
{ type: 'authenticate', data: { mode?: 'oauth' | 'apikey' } }
{ type: 'getAuthState' }
{ type: 'logout' }

// Memory Operations
{ type: 'getMemories' }
{ type: 'searchMemories', data: string } // query string
{ type: 'createMemory', data: CreateMemoryRequest }
{ type: 'selectMemory', data: string } // memory ID

// Chat Interface
{ type: 'chatQuery', data: string } // natural language query

// API Key Management (vscode secret storage)
{ type: 'getApiKeys' }
{ type: 'createApiKey', data: { name: string; scope?: string } }
{ type: 'deleteApiKey', data: string } // key ID
{ type: 'storeApiKey' }
```

**From Extension → Webview**:

```typescript
// Authentication
{ type: 'authState', data: { authenticated: boolean; error?: string } }

// Memory Operations
{ type: 'memories', data: PrototypeMemory[] }
{ type: 'memory', data: PrototypeMemory }
{ type: 'loading', data: boolean }

// Chat Interface
{ type: 'chatResponse', data: { query: string; response: string; memories: PrototypeMemory[] } }
{ type: 'chatLoading', data: boolean }
{ type: 'chatError', data: string }

// API Key Management
{ type: 'apiKeys', data: ApiKey[] }
{ type: 'apiKeyCreated', data: { success: boolean; message: string } }
{ type: 'apiKeyDeleted', data: { success: boolean; message: string } }
{ type: 'apiKeyError', data: string }

// Errors
{ type: 'error', data: string }
```

### Message Handler Pattern

**Extension Side**:

```typescript
private async handleWebviewMessage(data: { type: string; data?: unknown }) {
    try {
        switch (data.type) {
            case 'getAuthState':
                await this.sendAuthState();
                break;
            case 'authenticate': {
                const authData = data.data as { mode?: 'oauth' | 'apikey' } | undefined;
                await this.handleAuthentication(authData?.mode);
                break;
            }
            case 'chatQuery':
                await this.handleChatQuery(data.data as string);
                break;
            case 'getMemories':
                await this.sendMemories();
                break;
            // ... more cases
            default:
                console.warn('[EnhancedSidebarProvider] Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('[EnhancedSidebarProvider] Message handling error:', error);
        this._view?.webview.postMessage({
            type: 'error',
            data: error instanceof Error ? error.message : String(error)
        });
    }
}

private async sendAuthState() {
    try {
        const isAuthenticated = await this._bridge.isAuthenticated();
        this._view?.webview.postMessage({
            type: 'authState',
            data: { authenticated: isAuthenticated }
        });
    } catch {
        this._view?.webview.postMessage({
            type: 'authState',
            data: { authenticated: false, error: 'Failed to check authentication state' }
        });
    }
}
```

**Webview Side** (React Hook):

```typescript
// src/hooks/useAuth.tsx
export function useAuth(): UseAuthReturn {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const postMessage = useCallback((type: string, data?: unknown) => {
        if (window.vscode) {
            window.vscode.postMessage({ type, data });
        }
    }, []);
    
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            if (message.type === 'authState') {
                if (message.data && typeof message.data === 'object' && 'authenticated' in message.data) {
                    setIsAuthenticated((message.data as { authenticated: boolean }).authenticated);
                    setIsLoading(false);
                }
            }
        };
        
        window.addEventListener('message', handleMessage);
        postMessage('getAuthState');
        
        return () => window.removeEventListener('message', handleMessage);
    }, [postMessage]);
    
    const login = useCallback((mode?: 'oauth' | 'apikey') => {
        setIsLoading(true);
        postMessage('authenticate', { mode });
    }, [postMessage]);
    
    const logout = useCallback(() => {
        postMessage('logout');
    }, [postMessage]);
    
    return { isAuthenticated, isLoading, login, logout };
}
```

---

## Type System

### Core Types

**Memory Types** (`src/types/memory-aligned.ts`):

```typescript
export type MemoryType = 
    | 'conversation' 
    | 'knowledge' 
    | 'project' 
    | 'context' 
    | 'reference' 
    | 'personal' 
    | 'workflow';

export type MemoryStatus = 'active' | 'archived' | 'draft' | 'deleted';

export interface MemoryEntry {
    id: string;
    title: string;
    content: string;
    summary?: string;
    memory_type: MemoryType;
    status: MemoryStatus;
    relevance_score?: number;
    access_count: number;
    last_accessed?: string;
    user_id: string;
    topic_id?: string;
    project_ref?: string;
    tags: string[];
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface MemorySearchResult extends MemoryEntry {
    similarity_score: number;
}

export interface CreateMemoryRequest {
    title: string;
    content: string;
    memory_type: MemoryType;
    tags: string[];
    summary?: string;
    topic_id?: string;
    project_ref?: string;
    metadata?: Record<string, unknown>;
}

export interface SearchMemoryRequest {
    query: string;
    limit?: number;
    threshold?: number;
    status?: MemoryStatus;
    memory_type?: MemoryType;
    tags?: string[];
}
```

**Prototype Memory** (`src/bridges/PrototypeUIBridge.ts`):

```typescript
export interface PrototypeMemory {
    id: string;
    title: string;
    type: MemoryType;
    date: Date;
    tags: string[];
    content: string;
    iconType: 'terminal' | 'filecode' | 'hash' | 'calendar' | 'lightbulb' | 'briefcase' | 'user' | 'settings';
}
```

**Shared Types** (`src/shared/types.ts`):

```typescript
import { Lightbulb, Globe, Terminal, Briefcase, User, Settings, Hash, FileCode } from 'lucide-react';

export type MemoryIcon = typeof Lightbulb | typeof Globe | typeof Terminal | typeof Briefcase | typeof User | typeof Settings | typeof Hash | typeof FileCode;

export interface Memory {
    id: string;
    title: string;
    content: string;
    date: Date;
    tags: string[];
    type: 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';
    icon: MemoryIcon;
}
```

**API Key Types** (`src/services/ApiKeyService.ts`):

```typescript
export interface ApiKey {
    id: string;
    name: string;
    keyType: string;
    environment: string;
    accessLevel: string;
    projectId: string;
    createdAt: string;
    expiresAt?: string;
    tags: string[];
    metadata: Record<string, unknown>;
}

export interface CreateApiKeyRequest {
    name: string;
    value: string;
    keyType: 'api_key' | 'database_url' | 'oauth_token' | 'certificate' | 'ssh_key' | 'webhook_secret' | 'encryption_key';
    environment: 'development' | 'staging' | 'production';
    accessLevel: 'public' | 'authenticated' | 'team' | 'admin' | 'enterprise';
    projectId: string;
    tags?: string[];
    expiresAt?: string;
    rotationFrequency?: number;
    metadata?: Record<string, unknown>;
}
```

**Credential Types** (`src/services/SecureApiKeyService.ts`):

```typescript
export type CredentialType = 'oauth' | 'apiKey';

export interface StoredCredential {
    type: CredentialType;
    token: string;
}
```

---

## Utility Functions

### Hash Utilities (`src/utils/hash-utils.ts`)

```typescript
/**
 * Hash API key with SHA-256 (Node.js/VSCode environment)
 */
export function hashApiKey(apiKey: string): string {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('API key must be a non-empty string');
    }
    
    return crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');
}

/**
 * Check if value is already a SHA-256 hash
 */
export function isSha256Hash(value: string): boolean {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

/**
 * Normalize API key to hash (prevents double hashing)
 */
export function ensureApiKeyHash(apiKey: string): string {
    if (isSha256Hash(apiKey)) {
        return apiKey.toLowerCase();
    }
    return hashApiKey(apiKey);
}

/**
 * Verify API key against stored hash (constant-time comparison)
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
    const computedHash = hashApiKey(apiKey);
    
    if (computedHash.length !== storedHash.length) {
        return false;
    }
    
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    
    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}
```

### Class Name Utility (`src/utils/cn.ts`)

```typescript
/**
 * Simple className utility (replaces clsx + tailwind-merge)
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
    return inputs.filter(Boolean).join(' ');
}
```

### Diagnostics (`src/utils/diagnostics.ts`)

```typescript
export interface DiagnosticResult {
    component: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    details?: Record<string, unknown>;
}

export async function runDiagnostics(
    secureApiKeyService: SecureApiKeyService,
    memoryService: IMemoryService
): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    // Check authentication
    const hasKey = await secureApiKeyService.hasApiKey();
    results.push({
        component: 'Authentication',
        status: hasKey ? 'ok' : 'warning',
        message: hasKey ? 'API key configured' : 'No API key found'
    });
    
    // Test connection
    try {
        await memoryService.testConnection();
        results.push({
            component: 'Connection',
            status: 'ok',
            message: 'Successfully connected to API'
        });
    } catch (error) {
        results.push({
            component: 'Connection',
            status: 'error',
            message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
        });
    }
    
    return results;
}
```

---

## Integration Points

### 1. VS Code API Integration

**Commands Registration**:

```typescript
// In extension.ts
const commands = [
    vscode.commands.registerCommand('lanonasis.authenticate', async (mode?: 'oauth' | 'apikey') => {
        let apiKey: string | null = null;
        
        if (mode === 'oauth') {
            apiKey = await secureApiKeyService.authenticateWithOAuthFlow();
        } else if (mode === 'apikey') {
            apiKey = await secureApiKeyService.promptForApiKeyEntry();
        } else {
            apiKey = await secureApiKeyService.promptForAuthentication();
        }
        
        if (apiKey) {
            await handleAuthenticationSuccess();
            vscode.window.showInformationMessage('✅ Successfully authenticated');
        }
    }),
    
    vscode.commands.registerCommand('lanonasis.searchMemory', async () => {
        await searchMemories(memoryService);
    }),
    
    // ... more commands
];

context.subscriptions.push(...commands);
```

**Context Variables**:

```typescript
// Set context for when clauses in package.json
await vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);
await vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', authenticated);
await vscode.commands.executeCommand('setContext', 'lanonasis.enableApiKeyManagement', true);
```

**Tree Data Providers**:

```typescript
const memoryTreeProvider = new MemoryTreeProvider(memoryService);
context.subscriptions.push(
    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider)
);
```

**Completion Providers**:

```typescript
const completionProvider = new MemoryCompletionProvider(memoryService);
context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
        { scheme: 'file' },
        completionProvider,
        '@', '#', '//' // Trigger characters
    )
);
```

### 2. SDK Integration

**Memory Client SDK** (`@lanonasis/memory-client`):

```typescript
// In EnhancedMemoryService
import { MemoryClient } from '@lanonasis/memory-client';

private client: MemoryClient | null = null;

async refreshClient(): Promise<void> {
    const authHeader = await this.secureApiKeyService.getAuthenticationHeader();
    if (!authHeader) {
        throw new Error('Not authenticated');
    }
    
    const config = vscode.workspace.getConfiguration('lanonasis');
    const baseUrl = config.get<string>('apiUrl', 'https://mcp.lanonasis.com');
    
    this.client = new MemoryClient({
        baseUrl,
        authHeader
    });
}
```

**OAuth Client SDK** (`@lanonasis/oauth-client`):

```typescript
// Used in SecureApiKeyService for OAuth flows
// Handles PKCE, token refresh, etc.
```

### 3. Configuration Integration

**Reading Configuration**:

```typescript
const config = vscode.workspace.getConfiguration('lanonasis');

// Get values
const apiUrl = config.get<string>('apiUrl', 'https://mcp.lanonasis.com');
const useGateway = config.get<boolean>('useGateway', true);
const useEnhancedUI = config.get<boolean>('useEnhancedUI', false);

// Update values
await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
```

**Configuration Schema** (`package.json`):

```json
{
  "contributes": {
    "configuration": {
      "title": "Lanonasis Memory",
      "properties": {
        "lanonasis.apiUrl": {
          "type": "string",
          "default": "https://mcp.lanonasis.com",
          "description": "API base URL"
        },
        "lanonasis.useGateway": {
          "type": "boolean",
          "default": true,
          "description": "Use gateway for API requests"
        },
        "lanonasis.useEnhancedUI": {
          "type": "boolean",
          "default": false,
          "description": "Use enhanced React-based UI"
        }
      }
    }
  }
}
```

---

## Code Patterns & Examples

### Pattern 1: Service Initialization

```typescript
// Always initialize SecureApiKeyService first
const secureApiKeyService = new SecureApiKeyService(context, outputChannel);
await secureApiKeyService.initialize();

// Then initialize dependent services
const memoryService = new EnhancedMemoryService(secureApiKeyService);
const apiKeyService = new ApiKeyService(secureApiKeyService);
```

### Pattern 2: Error Handling

```typescript
try {
    await this.memoryService.createMemory(memory);
    vscode.window.showInformationMessage('Memory created successfully');
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to create memory: ${message}`);
    outputChannel.appendLine(`[Error] ${message}`);
}
```

### Pattern 3: Authentication Check

```typescript
private async ensureAuthenticated(): Promise<void> {
    if (!this.memoryService.isAuthenticated()) {
        const apiKey = await this.secureApiKeyService.getApiKeyOrPrompt();
        if (!apiKey) {
            throw new Error('Authentication required');
        }
        await this.memoryService.refreshClient();
    }
}
```

### Pattern 4: Webview Message Handling

```typescript
// Always wrap in try-catch
private async handleWebviewMessage(data: { type: string; data?: unknown }) {
    try {
        switch (data.type) {
            case 'getMemories':
                await this.sendMemories();
                break;
            // ... more cases
        }
    } catch (error) {
        this._view?.webview.postMessage({
            type: 'error',
            data: error instanceof Error ? error.message : String(error)
        });
    }
}
```

### Pattern 5: Tree Provider Refresh

```typescript
// Fire event to refresh tree
this._onDidChangeTreeData.fire();

// Or refresh specific item
this._onDidChangeTreeData.fire(item);

// Or refresh all
this._onDidChangeTreeData.fire(undefined);
```

### Pattern 6: Secret Storage Access

```typescript
// Store
await this.context.secrets.store('key', 'value');

// Retrieve
const value = await this.context.secrets.get('key');

// Delete
await this.context.secrets.delete('key');
```

### Pattern 7: Command Execution

```typescript
// Execute command
await vscode.commands.executeCommand('lanonasis.authenticate', 'oauth');

// Execute with arguments
await vscode.commands.executeCommand('lanonasis.openMemory', memory);

// Set context
await vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
```

---

## Security Best Practices

1. **Never store plaintext API keys** - Always hash with SHA-256
2. **Use SecretStorage** - Never use workspace settings for secrets
3. **Validate OAuth state** - Prevent CSRF attacks
4. **Constant-time comparison** - Use `crypto.timingSafeEqual` for hash verification
5. **CSP headers** - Always set Content-Security-Policy in webviews
6. **Nonce for scripts** - Use nonces for inline scripts in webviews

---

## Testing Patterns

### Mock VS Code API

```typescript
// In test setup
const mockVSCode = {
    postMessage: vi.fn(),
    setState: vi.fn(),
    getState: vi.fn(() => ({}))
};

Object.defineProperty(window, 'vscode', {
    value: mockVSCode,
    writable: true
});
```

### Mock SecretStorage

```typescript
const mockSecrets = new Map<string, string>();

const mockContext = {
    secrets: {
        get: vi.fn((key: string) => Promise.resolve(mockSecrets.get(key) || null)),
        store: vi.fn((key: string, value: string) => {
            mockSecrets.set(key, value);
            return Promise.resolve();
        }),
        delete: vi.fn((key: string) => {
            mockSecrets.delete(key);
            return Promise.resolve();
        })
    }
} as unknown as vscode.ExtensionContext;
```

---

## Summary

This infrastructure provides:

1. **Secure Authentication** - OAuth2 PKCE + API Key with hashing
2. **Service Abstraction** - Clean interfaces for memory operations
3. **Webview Communication** - Type-safe message passing
4. **Tree Views** - Native VS Code UI integration
5. **Code Completion** - Inline memory suggestions
6. **Error Handling** - Comprehensive error recovery
7. **Type Safety** - Full TypeScript coverage
8. **Extensibility** - Easy to add new features

All components follow VS Code best practices and integrate seamlessly with the IDE ecosystem.

