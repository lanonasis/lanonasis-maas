# 🔒 Security Fix: Removed Hardcoded Credentials

## Issue Detected
GitGuardian detected hardcoded Supabase credentials in `claude-code-config.json`:
- ❌ Supabase Service Role JWT
- ❌ Supabase Anon Key
- ❌ Production database URL

## Actions Taken

### 1. Removed Secrets from Version Control
- Unstaged `claude-code-config.json` before commit
- Added to `.gitignore` to prevent future commits

### 2. Created Safe Template
- Created `claude-code-config.example.json` with placeholder values
- Safe to commit and share publicly
- Developers can copy and fill in their own credentials

### 3. Updated .gitignore
```
cli/claude-code-config.json
```

## Setup Instructions for Developers

1. **Copy the example file:**
   ```bash
   cp cli/claude-code-config.example.json cli/claude-code-config.json
   ```

2. **Fill in your credentials:**
   - Get your Supabase URL from your project dashboard
   - Get your Service Role key (keep this secret!)
   - Get your Anon key (safe to use in client-side code)

3. **Update the path:**
   - Change the `args` path to match your local project location

## Environment Variables Alternative

Instead of using the config file, you can set environment variables:

```bash
export ONASIS_SUPABASE_URL=https://<project-ref>.supabase.co
export ONASIS_SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
export ONASIS_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
export MCP_SERVER_URL="https://mcp.lanonasis.com"
export LOG_LEVEL="info"
```

## Security Best Practices

✅ **DO:**
- Use environment variables for secrets
- Use `.env` files (and add them to `.gitignore`)
- Use example/template files with placeholders
- Use secret management services (AWS Secrets Manager, etc.)

❌ **DON'T:**
- Commit real credentials to version control
- Share service role keys publicly
- Hardcode secrets in source code
- Use production credentials in development

## Verification

Run GitGuardian scan to verify no secrets:
```bash
ggshield secret scan path .
```

## Related Files
- `cli/claude-code-config.example.json` - Safe template (committed)
- `cli/claude-code-config.json` - Your local config (gitignored)
- `.gitignore` - Updated to exclude config file

## Commit History
- Commit `23e18a6`: Added secure config management
- Commit `030d8a1`: Updated monorepo with security fix

---

**Status**: ✅ All secrets removed from version control
**GitGuardian**: ✅ Scan passed (no secrets detected)
