# Dashboard Architecture Notes

## Current Architecture (November 2025)

### Authentication Systems

#### 1. Auth Gateway (auth.lanonasis.com)
- **Location**: `/opt/lanonasis/onasis-core/services/auth-gateway/`
- **Status**: Running on PM2 (port 4000)
- **Endpoints**: 
  - OAuth: `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`, `/oauth/introspect`
  - MCP: `/mcp/auth`, `/mcp/health`
  - CLI: `/auth/cli-login`
  - Admin: `/admin/bypass-login`, `/admin/change-password`, `/admin/status`

#### 2. API Gateway (api.lanonasis.com)
- **Location**: Same repo (`/opt/lanonasis/onasis-core/`)
- **Deployment**: Netlify Functions
- **Status**: Deployed on Netlify
- **Netlify Config**: `/opt/lanonasis/onasis-core/netlify.toml`

#### 3. Dashboard (dashboard.lanonasis.com)
- **Location**: `/opt/lanonasis/lanonasis-maas/dashboard/`
- **Current Auth**: **Direct Supabase Auth** (15 instances found)
- **Issue**: Not integrated with auth-gateway OAuth system
- **Status**: Using Supabase client directly for authentication

### Current Issues

1. **Authentication Disconnect**
   - Dashboard uses direct Supabase auth (`supabase.auth.signInWithPassword`, `signInWithOAuth`)
   - Auth-gateway provides OAuth2 PKCE endpoints but dashboard doesn't use them
   - API key validation expects JWT tokens, but dashboard creates API keys that may not be properly formatted for the API gateway

2. **API Key Validation**
   - API keys created in dashboard have format: `vx_*`
   - API gateway expects JWT tokens in `Authorization: Bearer` header
   - Mismatch between key format and expected token format

3. **OAuth Flow**
   - Dashboard has OAuth callback handling but uses Supabase OAuth directly
   - Auth-gateway has OAuth endpoints but dashboard doesn't route through them
   - Two separate OAuth implementations

### Recommendations

1. **Migrate Dashboard to Auth-Gateway**
   - Update dashboard to use `auth.lanonasis.com/oauth/*` endpoints
   - Remove direct Supabase auth calls
   - Use auth-gateway as the single source of truth for authentication

2. **API Key Integration**
   - Ensure API keys created in dashboard are compatible with API gateway
   - May need token exchange endpoint: API key → JWT token
   - Or update API gateway to accept `vx_*` format keys directly

3. **Unified Authentication Flow**
   - Dashboard → auth-gateway → Supabase (if needed)
   - Single OAuth implementation
   - Consistent session management

### Test Results

- **API Key Format**: ✅ Valid (`vx_yffiou0jabo7zlnhtl2hu5e3yk1ugxx0`)
- **API Key Authentication**: ❌ Fails with "Invalid JWT token"
- **Health Endpoint**: ✅ Accessible
- **Dashboard OAuth**: ✅ Works but uses direct Supabase

### Next Steps

1. Review auth-gateway OAuth endpoints
2. Update dashboard to use auth-gateway instead of direct Supabase
3. Fix API key → JWT token flow
4. Test end-to-end authentication flow

