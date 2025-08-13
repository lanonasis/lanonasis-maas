# Supabase OAuth Configuration Fix

## Issue
Google and GitHub OAuth are redirecting to `api.lanonasis.com` instead of `dashboard.lanonasis.com/dashboard`.

## Root Cause
The OAuth provider configurations in Supabase Dashboard need to be updated with the correct redirect URLs.

## Solution

### 1. Update Supabase Dashboard OAuth Settings

Go to **Supabase Dashboard** → **Authentication** → **Providers** and update:

#### Google OAuth Provider
- **Redirect URL**: `https://dashboard.lanonasis.com/auth/callback`
- **Site URL**: `https://dashboard.lanonasis.com`

#### GitHub OAuth Provider  
- **Redirect URL**: `https://dashboard.lanonasis.com/auth/callback`
- **Site URL**: `https://dashboard.lanonasis.com`

### 2. Update OAuth App Configurations

#### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Select your OAuth 2.0 Client ID
4. Update **Authorized redirect URIs**:
   - Remove: `https://api.lanonasis.com/auth/callback`
   - Add: `https://dashboard.lanonasis.com/auth/callback`

#### GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Select your OAuth App
3. Update **Authorization callback URL**:
   - Change from: `https://api.lanonasis.com/auth/callback`
   - Change to: `https://dashboard.lanonasis.com/auth/callback`

### 3. Verify Current Settings

Check these URLs should be configured:

#### Production URLs
- **Site URL**: `https://dashboard.lanonasis.com`
- **Redirect URLs**: 
  - `https://dashboard.lanonasis.com/auth/callback`
  - `https://dashboard.lanonasis.com/dashboard` (fallback)

#### Local Development URLs (if needed)
- **Site URL**: `http://localhost:5173`
- **Redirect URLs**:
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/dashboard`

### 4. Test OAuth Flow

After updating the configurations:

1. **Clear browser cache and cookies**
2. Go to `https://dashboard.lanonasis.com/auth/login`
3. Click "Sign in with Google" or "Sign in with GitHub"
4. Complete OAuth flow
5. Verify redirect goes to `https://dashboard.lanonasis.com/dashboard`

### 5. Additional Netlify Configuration

Ensure the auth callback is properly handled in `netlify.toml`:

```toml
# Auth callback handling for OAuth
[[redirects]]
  from = "/auth/callback*"
  to = "/index.html"
  status = 200
  conditions = {Host = ["dashboard.lanonasis.com"]}
```

### 6. Environment Variables

Verify these environment variables in Netlify Dashboard:

```bash
VITE_SUPABASE_URL=https://mxtsdgkwzjzlttpotole.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Testing Checklist

- [ ] Google OAuth redirects to `dashboard.lanonasis.com/dashboard`
- [ ] GitHub OAuth redirects to `dashboard.lanonasis.com/dashboard`  
- [ ] Email/password login works normally
- [ ] Profile creation works for OAuth users
- [ ] Dashboard loads after successful authentication
- [ ] No redirect loops occur

## Common Issues

### Issue: Still redirecting to api.lanonasis.com
**Solution**: Clear browser cache, check OAuth app settings in Google/GitHub

### Issue: OAuth callback fails
**Solution**: Verify callback URLs match exactly in all configurations

### Issue: User profile not created
**Solution**: Check the OAuth user creation logic in `useAuth.tsx`

## File Locations

- **Client Configuration**: `dashboard/src/integrations/supabase/client.ts`
- **Auth Hook**: `dashboard/src/hooks/useAuth.tsx`
- **Netlify Config**: `netlify.toml`
- **Environment Variables**: Netlify Dashboard → Site Settings → Environment Variables