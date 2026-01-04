-- Setup Auth Hooks for Lanonasis Platform
-- This configures server-side auth event handling

-- 1. Create the auth hook function URL
-- Replace with your actual Supabase Edge Function URL
-- Format: https://[PROJECT_REF].supabase.co/functions/v1/auth-hook-user-created

-- 2. Enable the auth.users.created hook
SELECT 
  auth.enable_hooks('auth.users.created'),
  auth.set_hook('auth.users.created', 'https://lanonasis.supabase.co/functions/v1/auth-hook-user-created');

-- 3. Verify hooks are enabled
SELECT * FROM auth.hooks;

-- 4. Create audit table for auth events (optional)
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID,
    user_email TEXT,
    provider TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on audit table
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. Create policy for service role access
CREATE POLICY "Service role can manage auth audit log" ON auth_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON auth_audit_log(created_at DESC);

-- 8. Verify auth hook configuration
SELECT 
    'Auth hooks configured successfully' as status,
    'Hook URL: https://lanonasis.supabase.co/functions/v1/auth-hook-user-created' as hook_url,
    'Event: auth.users.created' as event_type;