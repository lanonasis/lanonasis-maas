# Immediate CLI Fix Implementation

## Quick Fix Steps (Complete in 30 minutes)

### 1. Update Backend Auth to Use Supabase Auth (10 minutes)

Create a new file `src/routes/auth-supabase.ts`:

```typescript
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';

const router = Router();
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

router.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Use Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // Generate JWT with proper claims
    const token = jwt.sign({
      sub: authData.user!.id,
      email: authData.user!.email,
      organizationId: authData.user!.user_metadata?.organization_id || 'default',
      role: authData.user!.user_metadata?.role || 'user',
      plan: authData.user!.user_metadata?.plan || 'free',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    }, config.JWT_SECRET);
    
    res.json({
      user: {
        id: authData.user!.id,
        email: authData.user!.email,
        organization_id: authData.user!.user_metadata?.organization_id || 'default',
        role: authData.user!.user_metadata?.role || 'user',
        plan: authData.user!.user_metadata?.plan || 'free',
        created_at: authData.user!.created_at,
        updated_at: authData.user!.updated_at || authData.user!.created_at
      },
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, organization_name } = req.body;
  
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization_name,
          organization_id: crypto.randomUUID(),
          role: 'admin',
          plan: 'free'
        }
      }
    });
    
    if (authError) throw authError;
    
    // Generate JWT
    const token = jwt.sign({
      sub: authData.user!.id,
      email: authData.user!.email,
      organizationId: authData.user!.user_metadata?.organization_id,
      role: 'admin',
      plan: 'free',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
    }, config.JWT_SECRET);
    
    res.status(201).json({
      user: {
        id: authData.user!.id,
        email: authData.user!.email,
        organization_id: authData.user!.user_metadata?.organization_id,
        role: 'admin',
        plan: 'free',
        created_at: authData.user!.created_at,
        updated_at: authData.user!.created_at
      },
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Registration failed', message: error.message });
  }
});

export default router;
```

### 2. Deploy to Netlify Functions (10 minutes)

Create `netlify/functions/api.js`:

```javascript
import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Login endpoint
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    const token = jwt.sign({
      sub: authData.user.id,
      email: authData.user.email,
      organizationId: authData.user.user_metadata?.organization_id || 'default',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
    }, process.env.JWT_SECRET);
    
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        organization_id: authData.user.user_metadata?.organization_id || 'default',
        role: authData.user.user_metadata?.role || 'user',
        plan: authData.user.user_metadata?.plan || 'free',
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at
      },
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Memory endpoints (stub for now)
app.post('/api/v1/memory', async (req, res) => {
  // TODO: Implement with Supabase
  res.json({ 
    id: crypto.randomUUID(),
    ...req.body,
    created_at: new Date().toISOString() 
  });
});

app.get('/api/v1/memory', async (req, res) => {
  // TODO: Implement with Supabase
  res.json({ 
    data: [],
    pagination: { total: 0, limit: 10, offset: 0, has_more: false }
  });
});

export const handler = serverless(app);
```

### 3. Update CLI Configuration (5 minutes)

Update `cli/src/utils/config.ts` to use environment-based endpoints:

```typescript
getApiUrl(): string {
  // Production: memory-api.lanonasis.com
  // Staging: dashboard.lanonasis.com
  // Development: localhost:3000
  
  if (process.env.MEMORY_API_URL) {
    return process.env.MEMORY_API_URL;
  }
  
  if (this.config.apiUrl) {
    return this.config.apiUrl;
  }
  
  // Default to dashboard for now until memory-api is live
  return 'https://dashboard.lanonasis.com/api/v1';
}
```

### 4. Test Commands (5 minutes)

```bash
# Build CLI
cd apps/lanonasis-maas/cli
bun run build

# Test health check
curl https://dashboard.lanonasis.com/api/v1/health

# Test login with existing Supabase user
bun run dev -- auth login --email user@example.com --password password123

# Test memory creation
bun run dev -- memory create "Test Memory" --content "Testing CLI"
```

## Deployment Steps

1. **Deploy Netlify Function**:
   ```bash
   cd apps/lanonasis-maas
   netlify deploy --prod
   ```

2. **Update DNS** (if memory-api subdomain ready):
   - Add CNAME: memory-api.lanonasis.com -> netlify-app.netlify.app

3. **Publish CLI Update**:
   ```bash
   cd apps/lanonasis-maas/cli
   npm version patch
   npm publish
   ```

## Immediate Testing Script

```bash
#!/bin/bash
# Quick test script

# Set to use dashboard endpoint temporarily
export MEMORY_API_URL="https://dashboard.lanonasis.com/api/v1"

# Test authentication
memory login

# Test memory operations
memory create "Quick test" --content "Testing deployment"
memory list
memory search "test"
```

## Success Criteria

- [ ] CLI can authenticate against Supabase Auth
- [ ] JWT tokens include proper claims (organizationId, role, plan)
- [ ] Memory CRUD operations work through API
- [ ] MCP server can connect and authenticate
- [ ] No breaking changes for existing users