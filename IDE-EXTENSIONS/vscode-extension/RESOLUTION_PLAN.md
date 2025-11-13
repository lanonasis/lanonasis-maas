# VSCode Extension Fetch Failure Resolution Plan

## 🔍 Investigation Summary

### Current Issues
1. **Extension stuck on "Loading Lanonasis Memory..."**
2. **Errors after successful authentication:**
   - `Failed to load memories: fetch failed`
   - `Failed to load API keys: fetch failed`
3. **Webview displays blank/loading state indefinitely**

### Root Causes Identified

#### 1. **Missing Compiled Files** ❌
The `out/` directory is missing critical compiled files:
- `out/panels/MemorySidebarProvider.js` - NOT FOUND
- `out/providers/ApiKeyTreeProvider.js` - NOT FOUND  
- `out/services/SecureApiKeyService.js` - NOT FOUND
- `out/services/EnhancedMemoryService.js` - NOT FOUND
- `out/services/ApiKeyService.js` - NOT FOUND
- `out/utils/errorRecovery.js` - NOT FOUND
- `out/utils/diagnostics.js` - NOT FOUND

**Current out/ contents (only 7 files):**
- extension.js
- providers/MemoryCompletionProvider.js
- providers/MemoryTreeProvider.js
- services/MemoryService.js
- services/memory-aligned.js
- services/memory-client-sdk.js
- types/memory-aligned.js

**Missing ~10+ essential files!**

#### 2. **Client Initialization Race Condition** ⚠️
- `MemoryService.ensureClient()` is async but called in constructor without await
- `refresh()` in sidebar called before client fully initialized
- No retry mechanism for failed initialization

#### 3. **Error Handling Issues** ⚠️
- Generic "fetch failed" error message not descriptive
- No network timeout handling beyond AbortSignal
- Missing CORS/authentication error specificity

#### 4. **URL Construction Issues** ⚠️
```typescript
// In memory-client-sdk.ts lines 66-70
const baseUrl = this.config.apiUrl.includes('/api') 
  ? this.config.apiUrl.replace('/api', '') 
  : this.config.apiUrl;
const url = `${baseUrl}/api/v1${endpoint}`;
```
This could create double `/api` paths or incorrect URLs.

#### 5. **Authentication Token Not Passed to Client** ❌
- OAuth authentication stores token in SecretStorage
- But `MemoryService.loadClient()` only reads API key, NOT OAuth token
- Need to check for OAuth token via `secureApiKeyService.getAuthenticationHeader()`

#### 6. **Webview Script Loading** ⚠️
- Webview expects `media/sidebar.js` and `media/sidebar.css`
- Files exist but may not be properly served
- CSP restrictions might block resources

---

## 🛠️ Resolution Plan

### Phase 1: Fix Build System (CRITICAL - Do First)

#### Step 1.1: Rebuild Extension
```bash
cd /Users/onasis/dev-hub/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension

# Clean previous build
rm -rf out/

# Install dependencies if needed
npm install

# Compile TypeScript
npm run compile

# Verify all files compiled
find out/ -name "*.js" | wc -l  # Should be ~20+ files
```

#### Step 1.2: Add Build Verification Script
Create `verify-build.sh`:
```bash
#!/bin/bash
REQUIRED_FILES=(
  "out/extension.js"
  "out/panels/MemorySidebarProvider.js"
  "out/providers/MemoryTreeProvider.js"
  "out/providers/ApiKeyTreeProvider.js"
  "out/providers/MemoryCompletionProvider.js"
  "out/services/MemoryService.js"
  "out/services/SecureApiKeyService.js"
  "out/services/ApiKeyService.js"
  "out/services/EnhancedMemoryService.js"
  "out/services/memory-client-sdk.js"
  "out/services/memory-aligned.js"
  "out/utils/errorRecovery.js"
  "out/utils/diagnostics.js"
  "media/sidebar.js"
  "media/sidebar.css"
)

MISSING=()
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING+=("$file")
  fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "✅ All required files present"
  exit 0
else
  echo "❌ Missing files:"
  printf '%s\n' "${MISSING[@]}"
  exit 1
fi
```

---

### Phase 2: Fix Authentication Token Flow

#### Step 2.1: Update MemoryService.loadClient()
**File:** `src/services/MemoryService.ts` lines 40-58

```typescript
private async loadClient(): Promise<void> {
    const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
    const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');
    const useGateway = this.config.get<boolean>('useGateway', true);
    const effectiveUrl = useGateway ? gatewayUrl : apiUrl;

    // Try OAuth token first, then API key
    let authToken: string | null = null;
    let apiKey: string | null = null;

    if (this.secureApiKeyService) {
        try {
            // Check for OAuth Bearer token first
            const authHeader = await this.secureApiKeyService.getAuthenticationHeader();
            if (authHeader) {
                authToken = authHeader.replace('Bearer ', '');
            }
        } catch (error) {
            console.warn('[MemoryService] Failed to get OAuth token', error);
        }

        // Fallback to API key if no OAuth token
        if (!authToken) {
            apiKey = await this.resolveApiKey();
        }
    }

    if (authToken || apiKey) {
        this.client = createMaaSClient({
            apiUrl: effectiveUrl,
            authToken: authToken || undefined,
            apiKey: apiKey || undefined,
            timeout: 30000
        });
        this.authenticated = true;
    } else {
        this.client = null;
        this.authenticated = false;
    }
}
```

#### Step 2.2: Add Proper Client Refresh After Auth
**File:** `src/extension.ts` lines 111-115

```typescript
const handleAuthenticationSuccess = async () => {
    // Force client reload with new credentials
    await memoryService.refreshClient();
    await apiKeyService.refreshConfig();
    
    // Wait a bit for client initialization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await applyAuthenticationState(true);
    announceEnhancedCapabilities();
};
```

---

### Phase 3: Fix URL Construction

#### Step 3.1: Simplify URL Building
**File:** `src/services/memory-client-sdk.ts` lines 61-91

```typescript
private async request<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Normalize base URL - remove trailing slash and any /api suffix
  let baseUrl = this.config.apiUrl.trim();
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  if (baseUrl.endsWith('/api') || baseUrl.endsWith('/api/v1')) {
    baseUrl = baseUrl.replace(/\/api(\/v1)?$/, '');
  }
  
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Build full URL
  const url = `${baseUrl}/api/v1${normalizedEndpoint}`;
  
  console.log('[MaaSClient] Request:', url); // Debug logging
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
    
    const response = await fetch(url, {
      headers: { ...this.baseHeaders, ...options.headers },
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data: any;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: `Unexpected response: ${text.substring(0, 100)}` };
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('[MaaSClient] Error:', errorMsg);
      return { error: errorMsg };
    }

    return { data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[MaaSClient] Request timeout:', url);
        return { error: 'Request timeout' };
      }
      console.error('[MaaSClient] Fetch error:', error.message);
      return { error: `Network error: ${error.message}` };
    }
    return { error: 'Unknown network error' };
  }
}
```

---

### Phase 4: Enhanced Error Handling & Retry Logic

#### Step 4.1: Add Retry Wrapper
**File:** `src/services/MemoryService.ts` - Add new method

```typescript
private async withRetry<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Don't retry on authentication errors
      if (errorMsg.includes('Not authenticated') || errorMsg.includes('401')) {
        throw error;
      }
      
      if (isLastAttempt) {
        throw error;
      }
      
      console.warn(`[MemoryService] Retry ${i + 1}/${retries} after error: ${errorMsg}`);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### Step 4.2: Use Retry in listMemories
```typescript
public async listMemories(limit: number = 50): Promise<MemoryEntry[]> {
    return this.withRetry(async () => {
        await this.ensureClient();
        const client = this.client;
        if (!client) {
            throw new Error('Not authenticated. Please configure your API key.');
        }

        const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1000);

        const response = await client.listMemories({
            limit: validatedLimit,
            sort: 'updated_at',
            order: 'desc'
        });

        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to fetch memories');
        }

        return response.data.data;
    });
}
```

---

### Phase 5: Fix Webview Initialization Race

#### Step 5.1: Add Proper Initialization Order
**File:** `src/panels/MemorySidebarProvider.ts` lines 80-87

```typescript
// Initial load with error handling and delay
setTimeout(async () => {
    try {
        // Give auth time to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.refresh();
    } catch (error) {
        console.error('[Lanonasis] Failed to load sidebar:', error);
        this._view?.webview.postMessage({
            type: 'error',
            message: 'Failed to load Lanonasis Memory. Please try refreshing or check authentication.'
        });
    }
}, 500);
```

#### Step 5.2: Better Error Messages in Webview
**File:** `src/panels/MemorySidebarProvider.ts` lines 133-154

```typescript
} catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Check for specific error types
    if (errorMsg.includes('Not authenticated') || errorMsg.includes('401')) {
        this._view.webview.postMessage({
            type: 'updateState',
            state: {
                authenticated: false,
                memories: [],
                loading: false
            }
        });
        return;
    }

    // Network/timeout errors
    if (errorMsg.includes('fetch') || errorMsg.includes('timeout') || errorMsg.includes('Network')) {
        this._view.webview.postMessage({
            type: 'error',
            message: `Connection failed: ${errorMsg}. Check your network and API endpoint configuration.`
        });
    } else {
        this._view.webview.postMessage({
            type: 'error',
            message: `Failed to load memories: ${errorMsg}`
        });
    }
    
    this._view.webview.postMessage({
        type: 'updateState',
        state: { loading: false }
    });
}
```

---

### Phase 6: Add Comprehensive Logging

#### Step 6.1: Enhanced Logging Service
Create `src/utils/logger.ts`:

```typescript
import * as vscode from 'vscode';

export class ExtensionLogger {
    private static instance: ExtensionLogger;
    private outputChannel: vscode.OutputChannel;
    private verbose: boolean;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Lanonasis Memory Debug');
        this.verbose = vscode.workspace.getConfiguration('lanonasis').get('verboseLogging', false);
    }

    static getInstance(): ExtensionLogger {
        if (!ExtensionLogger.instance) {
            ExtensionLogger.instance = new ExtensionLogger();
        }
        return ExtensionLogger.instance;
    }

    log(message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${message}`;
        this.outputChannel.appendLine(formattedMessage);
        if (args.length > 0) {
            this.outputChannel.appendLine(JSON.stringify(args, null, 2));
        }
        if (this.verbose) {
            console.log(formattedMessage, ...args);
        }
    }

    error(message: string, error?: Error | unknown): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`  ${error.name}: ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`  Stack: ${error.stack}`);
            }
        } else if (error) {
            this.outputChannel.appendLine(`  ${JSON.stringify(error)}`);
        }
        console.error(message, error);
    }

    show(): void {
        this.outputChannel.show();
    }
}
```

---

## 🎯 Execution Order

### Immediate Actions (Do Now)
1. ✅ **Rebuild extension** - Run `npm run compile`
2. ✅ **Verify build** - Check all files exist in `out/`
3. ✅ **Reload extension** - Restart VSCode or reload window
4. ✅ **Test authentication** - Try OAuth flow again

### Short-term Fixes (Next Session)
1. 🔧 Fix `MemoryService.loadClient()` to use OAuth token
2. 🔧 Fix URL construction in SDK client
3. 🔧 Add retry logic to API calls
4. 🔧 Improve error messages

### Long-term Improvements
1. 📈 Add comprehensive logging
2. 📈 Add health check on startup
3. 📈 Add connection status indicator
4. 📈 Add automatic reconnection

---

## 🧪 Testing Checklist

After applying fixes:

- [ ] Extension loads without errors
- [ ] Authentication flow completes successfully
- [ ] Sidebar displays authentication UI correctly
- [ ] After auth, memories load within 5 seconds
- [ ] API keys panel loads
- [ ] Search functionality works
- [ ] Create memory works
- [ ] Refresh button updates data
- [ ] Error messages are descriptive
- [ ] Developer Console shows proper logging
- [ ] Extension survives VSCode reload

---

## 📝 Configuration Verification

Check these settings in VSCode:
```json
{
  "lanonasis.apiUrl": "https://api.lanonasis.com",
  "lanonasis.gatewayUrl": "https://api.lanonasis.com",
  "lanonasis.useGateway": true,
  "lanonasis.verboseLogging": true  // Enable for debugging
}
```

---

## 🚨 Known Issues & Workarounds

### Issue: Extension still blank after rebuild
**Workaround:**
1. Uninstall extension completely
2. Delete `~/.vscode/extensions/lanonasis.*`
3. Rebuild and reinstall
4. Restart VSCode

### Issue: OAuth callback timeout
**Workaround:**
1. Use API key method instead
2. Check firewall isn't blocking localhost:8080
3. Manually visit callback URL format

### Issue: Fetch still fails with "Network error"
**Diagnostic steps:**
1. Open VSCode Developer Tools (Help > Toggle Developer Tools)
2. Check Console for detailed fetch errors
3. Check Network tab for actual HTTP requests
4. Verify API endpoint is accessible: `curl https://api.lanonasis.com/api/v1/health`

---

## 📚 VSCode API Best Practices Applied

1. ✅ **SecretStorage** for sensitive data (API keys, tokens)
2. ✅ **OutputChannel** for logging
3. ✅ **Webview CSP** for security
4. ✅ **Context management** for command enablement
5. ✅ **Activation events** optimization
6. ✅ **Progress indicators** for long operations
7. ✅ **Error recovery** with user-friendly messages
8. ⚠️ **Async initialization** needs improvement
9. ⚠️ **Resource cleanup** on deactivation needs addition

---

## 🎬 Next Steps

**Priority 1 (Critical):**
```bash
cd /Users/onasis/dev-hub/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension
rm -rf out/
npm run compile
# Reload VSCode window
```

**Priority 2 (Fix Auth):**
- Apply Step 2.1 changes to MemoryService.ts
- Test OAuth flow again

**Priority 3 (Improve Robustness):**
- Apply Phase 3 (URL fixes)
- Apply Phase 4 (retry logic)
- Apply Phase 5 (webview initialization)

Would you like me to start implementing these fixes?
