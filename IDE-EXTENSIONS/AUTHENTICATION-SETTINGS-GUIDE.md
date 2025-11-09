# IDE Extensions Authentication Settings Guide

**Date**: 2025-11-04
**Version**: 1.4.0
**Status**: ✅ VERIFIED

---

## Executive Summary

All three IDE extensions support **BOTH** OAuth2 and manual API key authentication methods. The implementation differs slightly between extensions:

- **VSCode**: Offers choice via command prompt
- **Cursor/Windsurf**: Controlled by `useAutoAuth` setting

---

## Authentication Methods Available

### Method 1: OAuth2 with PKCE (Recommended) 🔐

**Benefits:**
- ✅ Most secure (no credentials in IDE)
- ✅ Automatic token refresh
- ✅ Browser-based authentication
- ✅ Single sign-on support

**How to Use:**
1. Run command: `Lanonasis: Authenticate` (or `Authenticate with Lanonasis`)
2. Choose OAuth option (VSCode) or ensure `useAutoAuth = true` (Cursor/Windsurf)
3. Browser opens to auth.lanonasis.com
4. Login with your credentials
5. Automatically redirected back to IDE
6. Token stored securely in SecretStorage

### Method 2: Manual API Key Entry 🔑

**Benefits:**
- ✅ Works without browser
- ✅ Good for automation/scripts
- ✅ Simpler for testing
- ✅ Still stored securely (not plaintext)

**How to Use:**

#### VSCode Extension:
1. Run command: `Lanonasis: Authenticate`
2. Choose "API Key" option from the prompt
3. Enter your API key from api.lanonasis.com
4. Key stored in VS Code SecretStorage

#### Cursor/Windsurf Extensions:
1. Open Settings → Search for "lanonasis.useAutoAuth"
2. Set `lanonasis.useAutoAuth` to `false`
3. Run command: `Lanonasis: Authenticate with Lanonasis`
4. Enter your API key in the input box
5. Key stored in SecretStorage

---

## Settings Comparison Matrix

| Setting | VSCode | Cursor | Windsurf | Purpose |
|---------|---------|--------|----------|---------|
| **lanonasis.apiKey** | ⚠️ DEPRECATED | ❌ Removed | ❌ Removed | Plaintext API key (legacy) |
| **lanonasis.apiUrl** | ✅ Available | ✅ Available | ✅ Available | API endpoint URL |
| **lanonasis.gatewayUrl** | ✅ Available | ✅ Available | ✅ Available | Gateway endpoint URL |
| **lanonasis.authUrl** | ❌ Not needed | ✅ Available | ✅ Available | OAuth server URL |
| **lanonasis.useGateway** | ✅ Available | ✅ Available | ✅ Available | Use gateway vs direct API |
| **lanonasis.useAutoAuth** | ❌ Not needed | ✅ Available | ✅ Available | OAuth vs manual key |

---

## Detailed Settings Documentation

### VSCode Extension Settings

#### `lanonasis.apiKey` (DEPRECATED)
```json
{
  "lanonasis.apiKey": "your-api-key-here"
}
```
**Status**: ⚠️ **DEPRECATED in v1.4.0**
- Still works for backward compatibility
- Displays deprecation warning
- **Will be removed in future version**
- **Do not use for new installations**

**Migration Path:**
1. Run `Lanonasis: Configure Authentication` command
2. Choose OAuth or manual API key entry
3. Old key can be removed from settings

#### `lanonasis.apiUrl`
```json
{
  "lanonasis.apiUrl": "https://api.lanonasis.com"
}
```
**Status**: ✅ Active
- Direct API endpoint URL
- Only change if using custom deployment

#### `lanonasis.gatewayUrl`
```json
{
  "lanonasis.gatewayUrl": "https://api.lanonasis.com"
}
```
**Status**: ✅ Active
- Gateway endpoint for centralized API management
- Recommended for most users

#### `lanonasis.useGateway`
```json
{
  "lanonasis.useGateway": true
}
```
**Status**: ✅ Active
- **Default**: `true` (recommended)
- `true`: Use gateway URL
- `false`: Use direct API URL

---

### Cursor Extension Settings

#### ❌ `lanonasis.apiKey` - REMOVED
**This setting no longer exists in v1.4.0**

Use `lanonasis.useAutoAuth` instead to control authentication method.

#### `lanonasis.authUrl`
```json
{
  "lanonasis.authUrl": "https://auth.lanonasis.com"
}
```
**Status**: ✅ Active
- OAuth2 server URL
- Only change if using custom auth server

#### `lanonasis.useAutoAuth`
```json
{
  "lanonasis.useAutoAuth": true
}
```
**Status**: ✅ Active
- **Default**: `true`
- `true`: Use OAuth2 browser authentication (recommended)
- `false`: Show manual API key input prompt

**How it works:**
```typescript
// When useAutoAuth = true
authenticate() → Opens browser → OAuth2 flow → Token stored in SecretStorage

// When useAutoAuth = false
authenticate() → Shows input box → Enter API key → Stored in SecretStorage
```

---

### Windsurf Extension Settings

#### ❌ `lanonasis.apiKey` - REMOVED
**This setting no longer exists in v1.4.0**

Use `lanonasis.useAutoAuth` instead to control authentication method.

#### `lanonasis.authUrl`
```json
{
  "lanonasis.authUrl": "https://auth.lanonasis.com"
}
```
**Status**: ✅ Active
- OAuth2 server URL
- Only change if using custom auth server

#### `lanonasis.useAutoAuth`
```json
{
  "lanonasis.useAutoAuth": true
}
```
**Status**: ✅ Active (same as Cursor)
- **Default**: `true`
- `true`: Use OAuth2 browser authentication (recommended)
- `false`: Show manual API key input prompt

---

## User Workflows

### Scenario 1: New User - OAuth (Recommended)

**VSCode:**
1. Install extension
2. Click "Authenticate" in sidebar
3. Choose "OAuth (Browser)" option
4. Login in browser → Done ✅

**Cursor/Windsurf:**
1. Install extension
2. Ensure `useAutoAuth = true` (default)
3. Click "Authenticate with Lanonasis"
4. Login in browser → Done ✅

### Scenario 2: New User - Manual API Key

**VSCode:**
1. Install extension
2. Click "Authenticate" in sidebar
3. Choose "API Key" option
4. Paste API key → Done ✅

**Cursor/Windsurf:**
1. Install extension
2. Settings → Set `useAutoAuth = false`
3. Click "Authenticate with Lanonasis"
4. Paste API key → Done ✅

### Scenario 3: Migrating from v1.3.x (VSCode only)

**If you had plaintext API key in settings:**
1. Extension shows migration notice
2. Run `Lanonasis: Authenticate` command
3. Choose preferred method:
   - OAuth (recommended) → Old key can be removed
   - API Key → Re-enter key to migrate to SecretStorage
4. Old `lanonasis.apiKey` setting can be deleted

---

## Security Improvements in v1.4.0

### What Changed:

| Feature | v1.3.x | v1.4.0 |
|---------|---------|--------|
| **API Key Storage** | Plaintext in settings.json | SecretStorage (encrypted) |
| **OAuth Support** | ❌ None | ✅ OAuth2 with PKCE |
| **Token Management** | Manual | Automatic refresh |
| **Credential Leaks** | Possible in logs | Prevented by ConsoleRedactor |
| **Settings Visibility** | ✅ Visible in JSON | ✅ Hidden in SecretStorage |

### Where Credentials Are Stored:

**VSCode:**
- **Before v1.4.0**: `~/.config/Code/User/settings.json` (plaintext)
- **After v1.4.0**: VS Code SecretStorage API (OS keychain)
  - macOS: Keychain
  - Windows: Credential Manager
  - Linux: Secret Service API

**Cursor/Windsurf:**
- **v1.4.0**: SecretStorage only (never plaintext)

---

## Troubleshooting

### "Authentication failed" Error

**For OAuth:**
1. Check browser opened correctly
2. Verify auth.lanonasis.com is accessible
3. Check firewall allows localhost:8080
4. Try disabling browser extensions
5. Clear browser cache and retry

**For Manual API Key:**
1. Verify key is correct (copy from api.lanonasis.com)
2. Check key hasn't expired
3. Ensure no extra spaces when pasting
4. Try regenerating key

### "Port 8080 already in use" (OAuth)

**Solution:**
1. Close other applications using port 8080
2. Or wait for OAuth timeout (5 minutes)
3. Retry authentication

### Migration Issues (VSCode)

**If old API key not working after migration:**
1. Run `Lanonasis: Clear API Key` command
2. Re-authenticate using new method
3. Remove old `lanonasis.apiKey` from settings.json

---

## Developer Notes

### Code References:

**VSCode - Prompt-based choice:**
```typescript
// File: vscode-extension/src/services/SecureApiKeyService.ts:82-142
async promptForAuthentication(): Promise<string | null> {
  const choice = await vscode.window.showQuickPick([
    { label: 'OAuth (Browser)', value: 'oauth' },
    { label: 'API Key', value: 'apikey' },
    { label: 'Cancel', value: 'cancel' }
  ]);

  if (choice.value === 'oauth') {
    return await this.authenticateOAuth();
  } else if (choice.value === 'apikey') {
    return await vscode.window.showInputBox({
      prompt: 'Enter your Lanonasis API Key',
      password: true
    });
  }
}
```

**Cursor/Windsurf - Setting-based choice:**
```typescript
// File: cursor-extension/src/extension.ts:418-468
async function authenticate(authService, memoryTreeProvider) {
  const useAutoAuth = vscode.workspace.getConfiguration('lanonasis')
    .get<boolean>('useAutoAuth', true);

  if (useAutoAuth) {
    // OAuth2 flow
    await authService.authenticateWithBrowser();
  } else {
    // Manual API key entry
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your Lanonasis API Key',
      password: true
    });
    await authService.authenticateWithApiKey(apiKey);
  }
}
```

---

## Summary

### Key Takeaways:

1. ✅ **Both methods work** in all extensions
2. ✅ **No plaintext storage** in v1.4.0
3. ✅ **OAuth is default** (most secure)
4. ✅ **Manual API key available** (via setting or prompt)
5. ✅ **Backward compatible** (VSCode only)

### Recommendation:

**For end users:**
- Use OAuth2 (browser authentication) - most secure and convenient

**For automation/CI/CD:**
- Use manual API key with `useAutoAuth = false`
- Store key in environment variables, not in IDE settings

**For developers:**
- Test both flows
- Use OAuth for daily development
- Use API key for scripting

---

**Document Version**: 1.0
**Last Updated**: 2025-11-04
**Applies to**: VSCode 1.4.0, Cursor 1.4.0, Windsurf 1.4.0
