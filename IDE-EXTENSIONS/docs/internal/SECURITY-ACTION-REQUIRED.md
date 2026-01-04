# 🚨 CRITICAL SECURITY ACTION REQUIRED 🚨

**Date**: 2025-11-04
**Priority**: URGENT
**Action**: REGENERATE YOUR PERSONAL ACCESS TOKEN IMMEDIATELY

---

## What Happened

During the marketplace publishing process, your Personal Access Token (PAT) was exposed in:
- ✅ Chat/conversation history
- ✅ Command execution logs
- ✅ Shell history

**Token Details:**
- **Ending in**: ...ASAZDO1lRk
- **Used for**: VSCode Marketplace publishing
- **Scope**: Marketplace → Manage (full access)
- **Status**: ⚠️ **EXPOSED - MUST BE REVOKED**

---

## Why This Is Critical

### Risks of Exposed Token

An exposed PAT can be used to:
- ❌ Publish malicious extensions under your name
- ❌ Unpublish your extensions
- ❌ Modify extension metadata
- ❌ Access publisher analytics
- ❌ Manage other marketplace items
- ❌ Impersonate your publisher account

### Impact Level: HIGH 🔴

This token has **full marketplace management access** for publisher "LanOnasis".

---

## IMMEDIATE ACTIONS (DO NOW)

### Step 1: Revoke the Exposed Token ⚠️

1. **Go to Azure DevOps:**
   - URL: https://dev.azure.com/[your-org]/_usersSettings/tokens
   - OR: https://marketplace.visualstudio.com/manage/publishers/LanOnasis

2. **Find the token:**
   - Look for recent tokens (created before Nov 4, 2025)
   - Identify by name or description
   - Token ending in: ...ASAZDO1lRk

3. **Revoke immediately:**
   - Click "..." menu next to the token
   - Select "Revoke"
   - Confirm revocation

### Step 2: Create a New Token ✅

1. **Click "+ New Token"**

2. **Configure:**
   ```
   Name: VSCode Publishing - Nov 2025
   Organization: All accessible organizations
   Expiration: 90 days
   Scopes: ✓ Marketplace → Manage
   ```

3. **Create and SAVE the token:**
   ```
   IMPORTANT: Copy the token immediately!
   You won't be able to see it again.
   ```

### Step 3: Store the New Token Securely ✅

**Option A: Environment Variable (Recommended for Dev)**
```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export VSCE_PAT="your-new-token-here"' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $VSCE_PAT  # Should show your token
```

**Option B: Password Manager (Best for Production)**
- 1Password
- LastPass
- Bitwarden
- macOS Keychain
- Any secure password manager

**Option C: CI/CD Secrets (Best for Automation)**
```yaml
# GitHub Actions example
- name: Publish Extension
  env:
    VSCE_PAT: ${{ secrets.VSCE_PAT }}
  run: vsce publish
```

### Step 4: Verify Revocation ✅

```bash
# Try using the OLD token (should fail)
export OLD_PAT="[old-token]"
vsce verify-pat $OLD_PAT
# Expected: "invalid_token" error ✓

# Try using the NEW token (should work)
export VSCE_PAT="[new-token]"
vsce verify-pat $VSCE_PAT
# Expected: Success ✓
```

---

## What NOT To Do

### ❌ Never Do This:
1. **Don't share tokens in chat/email/messages**
   - Not even "temporarily"
   - Not even with teammates
   - Use secure sharing methods only

2. **Don't commit tokens to git**
   ```bash
   # Wrong:
   echo "VSCE_PAT=abc123" >> .env
   git add .env

   # Right:
   echo ".env" >> .gitignore
   ```

3. **Don't store in plaintext files**
   - No `token.txt`
   - No `credentials.json`
   - No `config.ini`

4. **Don't log tokens**
   ```bash
   # Wrong:
   echo "Publishing with token: $VSCE_PAT"

   # Right:
   echo "Publishing with token: [REDACTED]"
   ```

---

## How to Use Tokens Securely

### For Local Development

```bash
# 1. Store in environment
export VSCE_PAT="your-token"

# 2. Publish without exposing token
vsce publish

# 3. Never print/log the token
```

### For CI/CD (GitHub Actions)

```yaml
name: Publish Extension
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Publish to Marketplace
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          npm install -g vsce
          vsce publish
```

**Add secret in GitHub:**
1. Repository → Settings → Secrets → Actions
2. New repository secret
3. Name: `VSCE_PAT`
4. Value: [your token]

### For Team Collaboration

**Use a dedicated service account:**
```
Publisher Account: lanonasis-ci
Email: ci@lanonasis.com
Purpose: Automated publishing only
Access: Marketplace only
Token Rotation: Every 90 days
```

---

## Security Best Practices

### Token Management

1. **Rotate regularly** (every 90 days minimum)
2. **Use minimum permissions** (only what's needed)
3. **One token per purpose** (don't reuse)
4. **Monitor usage** (check Azure DevOps logs)
5. **Revoke unused tokens** (cleanup old tokens)

### Access Control

```
Developer Workstation:
  ├─ VSCE_PAT (marketplace publish only)
  ├─ GITHUB_TOKEN (repository access only)
  └─ NPM_TOKEN (package publish only)

CI/CD Pipeline:
  ├─ Secrets stored in GitHub/GitLab
  ├─ Rotated every 90 days
  └─ Audit logs enabled
```

### Monitoring

**Check for unauthorized activity:**
1. Publisher dashboard: https://marketplace.visualstudio.com/manage
2. Check recent publishes
3. Check extension modifications
4. Review analytics for anomalies

---

## Checklist

### Immediate Actions
- [ ] ⚠️ Revoked exposed token (ending in ...ASAZDO1lRk)
- [ ] ✅ Created new token
- [ ] ✅ Stored new token securely (env var or password manager)
- [ ] ✅ Tested new token works
- [ ] ✅ Deleted exposed token from all locations

### Preventive Actions
- [ ] Added tokens to .gitignore
- [ ] Set up password manager for tokens
- [ ] Configured CI/CD with secrets
- [ ] Set calendar reminder for token rotation (90 days)
- [ ] Documented token management process for team

### Follow-up Actions
- [ ] Monitor marketplace for unauthorized changes (next 7 days)
- [ ] Review Azure DevOps audit logs
- [ ] Update team security guidelines
- [ ] Consider implementing token rotation automation

---

## Timeline

### What Happened
```
2025-11-04 20:00 - Token exposed in chat
2025-11-04 20:30 - Extension published successfully
2025-11-04 20:35 - Security issue identified
2025-11-04 20:40 - This document created
```

### What You Must Do
```
2025-11-04 NOW   - Read this document
2025-11-04 NOW   - Revoke exposed token
2025-11-04 NOW   - Create new token
2025-11-04 NOW   - Store securely
```

---

## FAQs

### Q: Is my extension compromised?
**A**: No, the extension itself is secure. Only the publishing token was exposed.

### Q: Can someone unpublish my extension?
**A**: Yes, if they have your token. That's why you must revoke it NOW.

### Q: How long is my token valid?
**A**: Until you revoke it. Don't wait - do it now.

### Q: Will revoking break my published extension?
**A**: No, revoking only prevents future publishes with that token. Your extension stays live.

### Q: Can I use the same token for multiple publishers?
**A**: No, create separate tokens for each publisher/project.

### Q: How often should I rotate tokens?
**A**: Every 90 days minimum, or immediately if exposed.

---

## Additional Resources

### Documentation
- **Azure DevOps PAT Docs**: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
- **VS Code Publishing**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Security Best Practices**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#security

### Tools
- **vsce CLI**: https://github.com/microsoft/vscode-vsce
- **Password Managers**: 1Password, LastPass, Bitwarden
- **Secret Scanners**: git-secrets, truffleHog, gitleaks

---

## Summary

### What You Need to Do RIGHT NOW:

1. ⚠️ **REVOKE** the exposed token (ending in ...ASAZDO1lRk)
2. ✅ **CREATE** a new token with proper security
3. ✅ **STORE** it securely (not in plaintext)
4. ✅ **VERIFY** the old token no longer works
5. ✅ **MONITOR** your marketplace account for 7 days

### Time Required: 5-10 minutes

### Priority: CRITICAL 🔴

**Don't delay - your publisher account security depends on this!**

---

**Document Created**: 2025-11-04 20:40
**Action Required By**: IMMEDIATELY
**Severity**: CRITICAL
**Status**: ⚠️ ACTION PENDING

---

**🚨 STOP READING AND GO REVOKE THAT TOKEN NOW 🚨**
