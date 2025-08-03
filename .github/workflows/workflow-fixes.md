# GitHub Actions Workflow Fixes

## Required Secrets Configuration

Add these secrets in your GitHub repository settings:
(Settings → Secrets and variables → Actions)

### Required Secrets:
1. **TEST_SUPABASE_URL=https://<project-ref>.supabase.co
2. **TEST_SUPABASE_KEY** - Supabase anon key for testing
3. **TEST_SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
4. **TEST_OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
5. **AWS_ACCESS_KEY_ID** - AWS credentials (if using AWS deployment)
6. **AWS_SECRET_ACCESS_KEY** - AWS secret key
7. **NPM_TOKEN** - npm authentication token for publishing

### Optional Secrets:
- **POSTGRES_PASSWORD** - If using external PostgreSQL
- **DOCKER_USERNAME** - For Docker Hub publishing
- **DOCKER_PASSWORD** - Docker Hub password

## Quick Fix for Workflow

If you don't need all features immediately, you can:

1. **Disable failing jobs** by commenting them out
2. **Use dummy values** for non-critical secrets
3. **Focus on essential workflows** (test, build)

## Minimal Working Configuration

```yaml
env:
  # Use placeholder values for development
  SUPABASE_URL=https://<project-ref>.supabase.co
  SUPABASE_KEY: ${{ secrets.TEST_SUPABASE_KEY || 'placeholder-key' }}
  JWT_SECRET=REDACTED_JWT_SECRET
```