# 🔐 CLI Security Implementation

## Overview

The Lanonasis CLI implements **enterprise-grade credential security** with a hybrid approach combining hashing and encryption to protect user credentials while maintaining usability.

## Security Architecture

### Two-Tier Credential Storage

#### 1. **API Keys** (Hash-Only Storage)
**Use Case:** Commands like `api-keys`, `dashboard`, `documentation`, `sdk`, `api`, `deploy`, `service`

**Security Model:**
- ✅ **One-way SHA-256 hashing** - Keys cannot be reversed
- ✅ **Server-side validation** - Server stores hashes, compares on auth
- ✅ **Zero plaintext storage** - Original keys never saved
- ✅ **Secure by default** - No configuration needed

**Implementation:**
```typescript
import { hashApiKey } from './utils/hash-utils';

// Store only the hash
const keyHash = hashApiKey(apiKey);
config.set('apiKeyHash', keyHash);

// Validation (server-side)
const providedHash = hashApiKey(providedKey);
if (providedHash === storedHash) {
  // Authenticated
}
```

**Files:**
- `src/utils/hash-utils.ts` - Hashing functions
- `src/commands/api-keys.ts` - API key management

---

#### 2. **Vendor Keys** (Encrypted Storage)
**Use Case:** Authentication headers (`X-API-Key`) in API requests

**Security Model:**
- 🔐 **AES-256-GCM encryption** - Military-grade encryption
- 🔑 **Machine-specific key derivation** - Encryption key tied to machine
- 🛡️ **Authentication tags** - Tamper detection
- 🔄 **Backward compatibility** - Supports legacy plaintext (auto-migrates)

**Implementation:**
```typescript
import { secureStoreVendorKey, retrieveVendorKey } from './utils/crypto-utils';

// Storage (encrypted)
const secureKey = secureStoreVendorKey(vendorKey);
config.set('vendorKey', secureKey);

// Retrieval (decrypted)
const vendorKey = retrieveVendorKey(secureKey);
// Use in API headers
headers['X-API-Key'] = vendorKey;
```

**Files:**
- `src/utils/crypto-utils.ts` - Encryption/decryption functions
- `src/utils/config.ts` - Secure storage integration

---

## Encryption Details

### Algorithm: AES-256-GCM
- **Cipher:** AES (Advanced Encryption Standard)
- **Key Size:** 256 bits
- **Mode:** GCM (Galois/Counter Mode) with authentication
- **IV Length:** 128 bits (random per encryption)
- **Auth Tag:** 128 bits (tamper detection)

### Key Derivation: PBKDF2
- **Base Secret:** Machine ID (hostname + platform + homedir)
- **Optional:** User passphrase for additional security
- **Iterations:** 100,000 (OWASP recommended)
- **Hash:** SHA-256
- **Output:** 256-bit encryption key

### Storage Format

**Encrypted Vendor Key Structure:**
```json
{
  "keyHash": "sha256_hash_64_chars",
  "encryptedKey": {
    "encrypted": "base64_ciphertext",
    "iv": "base64_initialization_vector",
    "authTag": "base64_auth_tag",
    "salt": "base64_salt",
    "version": "1.0"
  },
  "createdAt": "2025-11-25T...",
  "lastUsed": "2025-11-25T...",
  "encrypted": true
}
```

**Benefits:**
- ✅ **Lookup/Validation:** Use `keyHash` without decryption
- ✅ **API Requests:** Decrypt `encryptedKey` only when needed
- ✅ **Tamper Detection:** `authTag` verifies integrity
- ✅ **Future-Proof:** `version` allows migration

---

## Security Features

### 1. **Authentication Bypass Prevention**
**Fixed Issue:** Revoked tokens could work if server unreachable

**Solution:**
```typescript
// Distinguish network errors from auth errors
if (authError) {
  // Server explicitly rejected - fail closed
  return false;
}

if (networkError && locallyValid) {
  // Grace period: 7 days for offline usage
  if (withinGracePeriod) {
    return true; // Cached validation
  }
  return false; // Expired grace period
}
```

**Result:**
- ⛔ **Fail Closed:** Auth failures always block access
- ⏱️ **Grace Period:** 7 days offline tolerance
- 🔒 **Server Authority:** Explicit rejection overrides local cache

---

### 2. **Vendor Key Validation**
**Fixed Issue:** "Validation" only pinged health endpoint

**Solution:**
```typescript
// Multiple validation endpoints
const endpoints = [
  '/api/v1/auth/validate',
  '/api/v1/auth/validate-vendor-key',
  '/v1/auth/validate'
];

// Actual key validation
const response = await axios.post(endpoint, { key: vendorKey });
if (response.data.valid === true) {
  // Key is valid
}
```

**Result:**
- ✅ **Real Validation:** Server checks key against database
- ✅ **Multiple Endpoints:** Fallback for reliability
- ✅ **Stored Securely:** Only persisted after validation

---

### 3. **Connection State Persistence**
**Fixed Issue:** Successful connections not saved

**Solution:**
```typescript
// Auto-persist after successful connection
await this.persistConnectionState('websocket', wsUrl);

// Saves to ~/.maas/config.json
config.set('mcpConnectionMode', mode);
config.set('mcpWebSocketUrl', url);
await config.save();
```

**Result:**
- 💾 **Remembers Working Config:** Next run uses same mode
- 🚀 **Fast Reconnection:** No trial-and-error
- 🔄 **Auto-Updates:** Always uses last successful connection

---

## CLI Command Security Mapping

### 🔑 API Key Commands (Hash-Only)
```bash
onasis api-keys create        # Creates API key, stores hash
onasis api-keys list          # Lists keys by hash
onasis api-keys revoke <id>   # Revokes by hash lookup
```

**Security:** One-way hash, cannot extract original key

---

### 🔐 Vendor Key Commands (Encrypted)
```bash
onasis auth                   # Stores vendor key encrypted
onasis status                 # Validates without decryption (uses hash)
onasis mcp connect            # Decrypts key for API headers
```

**Security:** AES-256-GCM encryption, decrypts only when needed

---

### 🎛️ Service Commands (Use Encrypted Keys)
```bash
onasis dashboard deploy       # Uses encrypted vendor key in headers
onasis documentation build    # Uses encrypted vendor key in headers
onasis sdk publish            # Uses encrypted vendor key in headers
onasis api test               # Uses encrypted vendor key in headers
onasis deploy production      # Uses encrypted vendor key in headers
onasis service restart <name> # Uses encrypted vendor key in headers
```

**Security:** Automatic decryption for API requests, never logged

---

## Configuration Storage

### Location
```
~/.maas/config.json
```

### Permissions
- **Recommended:** `600` (owner read/write only)
- **Set by:** `chmod 600 ~/.maas/config.json`

### Sample Configuration
```json
{
  "version": "1.0.0",
  "authMethod": "vendor_key",
  "vendorKey": {
    "keyHash": "abc123...",
    "encryptedKey": {
      "encrypted": "encrypted_data...",
      "iv": "random_iv...",
      "authTag": "auth_tag...",
      "salt": "random_salt...",
      "version": "1.0"
    },
    "encrypted": true,
    "createdAt": "2025-11-25T..."
  },
  "lastValidated": "2025-11-25T...",
  "mcpConnectionMode": "websocket",
  "mcpWebSocketUrl": "wss://mcp.lanonasis.com/ws"
}
```

---

## Migration & Backward Compatibility

### Automatic Migration
The CLI automatically migrates legacy plaintext credentials:

```typescript
// Detection
if (needsEncryptionMigration(config.vendorKey)) {
  console.log('ℹ️  Vendor key will be encrypted on next authentication');
}

// Migration (next auth)
await config.setVendorKey(plaintextKey, useEncryption: true);
// Plaintext → Encrypted (seamless upgrade)
```

### Manual Migration
```bash
# Re-authenticate to trigger encryption
onasis auth

# Or force migration
onasis config migrate-encryption
```

---

## Security Best Practices

### For Users

1. **Enable Encryption** (Default)
   ```bash
   # Encryption enabled by default
   onasis auth
   ```

2. **Set File Permissions**
   ```bash
   chmod 600 ~/.maas/config.json
   ```

3. **Rotate Keys Regularly**
   ```bash
   # Generate new vendor key from dashboard
   onasis auth  # Re-authenticate with new key
   ```

4. **Use Environment Variables (CI/CD)**
   ```bash
   # For automated environments
   export LANONASIS_VENDOR_KEY=vx_...
   onasis deploy --use-env-key
   ```

### For Developers

1. **Never Log Decrypted Keys**
   ```typescript
   // BAD
   console.log('Key:', vendorKey);

   // GOOD
   if (process.env.CLI_VERBOSE === 'true') {
     console.log('Key hash:', keyHash);
   }
   ```

2. **Use Hashing for Lookups**
   ```typescript
   // Don't decrypt just to validate
   const isValid = validateVendorKeyHash(input, storedHash);
   ```

3. **Clear Sensitive Data**
   ```typescript
   // After use
   vendorKey = null;
   delete headers['X-API-Key'];
   ```

---

## Testing

### Encryption Tests
```bash
bun test src/utils/crypto-utils.test.ts
```

### Security Audit
```bash
# Check for plaintext credentials
onasis security audit

# Verify encryption
onasis config verify-encryption
```

---

## Security Considerations

### ✅ Strengths
- Military-grade encryption (AES-256-GCM)
- Machine-specific key derivation
- Tamper detection (auth tags)
- Automatic migration from plaintext
- Offline grace period (7 days)

### ⚠️ Limitations
- Machine-bound encryption (not portable across machines)
- Config file still accessible to user account
- No HSM/TPM integration (future enhancement)

### 🔮 Future Enhancements
- System keychain integration (macOS Keychain, Windows Credential Manager)
- Multi-factor authentication support
- Hardware security module (HSM) support
- Biometric authentication (Touch ID, Face ID)

---

## Incident Response

### If Config File Compromised

1. **Revoke All Keys Immediately**
   ```bash
   # From dashboard: Revoke all API keys
   # Or via CLI:
   onasis api-keys revoke-all
   ```

2. **Generate New Credentials**
   ```bash
   # Get new vendor key from dashboard
   onasis auth  # Re-authenticate
   ```

3. **Check Access Logs**
   ```bash
   onasis audit logs --suspicious
   ```

### If Encryption Key Compromised

1. **Rotate Machine ID**
   ```bash
   # Force re-encryption with new machine ID
   onasis config rotate-encryption-key
   ```

2. **Set User Passphrase**
   ```bash
   # Add additional passphrase layer
   onasis config set-encryption-passphrase
   ```

---

## References

### Standards & Specifications
- [NIST AES-256-GCM](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [PBKDF2 RFC 8018](https://datatracker.ietf.org/doc/html/rfc8018)

### Related Files
- `src/utils/crypto-utils.ts` - Encryption implementation
- `src/utils/hash-utils.ts` - Hashing utilities
- `src/utils/config.ts` - Secure storage integration
- `src/commands/auth.ts` - Authentication flow
- `src/commands/api-keys.ts` - API key management

---

**Last Updated:** 2025-11-25
**Version:** 3.7.0
**Security Contact:** security@lanonasis.com
