# Getting Supabase Keys

## Quick Links

### 1. Supabase Dashboard
Go to: https://supabase.com/dashboard/project/mxtsdgkwzjzlttpotole/settings/api

### 2. What to Copy

#### For TEST_SUPABASE_KEY:
- Look for **"anon public"** key
- This is safe to use in frontend applications
- Starts with: `eyJ...`

#### For TEST_SUPABASE_SERVICE_KEY:
- Look for **"service_role secret"** key
- ⚠️ KEEP THIS SECRET - Never expose in frontend
- Also starts with: `eyJ...`

### 3. Alternative: Use Supabase CLI

If you have access to the project owner account:

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref mxtsdgkwzjzlttpotole

# Get keys (requires owner access)
supabase secrets list
```

## NPM Token

1. Go to: https://www.npmjs.com/settings/~/tokens
2. Click "Generate New Token"
3. Select "Automation" type
4. Copy the token (starts with `npm_`)

## OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it (e.g., "lanonasis-maas")
4. Copy the key (starts with `sk-`)

## Run the Configuration Script

After getting all keys:

```bash
./configure-github-secrets.sh
```

The script will:
- Set TEST_SUPABASE_URL automatically
- Prompt you for the keys
- Generate a secure JWT_SECRET
- Configure all GitHub Actions secrets