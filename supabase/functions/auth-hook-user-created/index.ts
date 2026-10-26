import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: any
  schema: string
  old_record: any | null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: WebhookPayload = await req.json()
    
    // Only handle user creation events
    if (payload.type !== 'INSERT' || payload.table !== 'users') {
      return new Response('Not a user creation event', { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const user = payload.record
    console.log('🎯 New user created:', user.email, 'via', user.app_metadata?.provider || 'email')

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      console.log('✅ Profile already exists for user:', user.email)
      return new Response('Profile already exists', { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Create organization for new user
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: user.user_metadata?.company_name || 
              user.user_metadata?.full_name + "'s Organization" || 
              user.email?.split('@')[0] + "'s Organization",
        plan: 'free',
        settings: {}
      })
      .select()
      .single()

    if (orgError) {
      console.error('❌ Failed to create organization:', orgError)
      throw orgError
    }

    console.log('🏢 Created organization:', organization.name, 'for user:', user.email)

    // Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 
                  user.user_metadata?.name || 
                  user.email?.split('@')[0],
        company_name: user.user_metadata?.company_name || null,
        avatar_url: user.user_metadata?.avatar_url || 
                   user.user_metadata?.picture || null,
        role: 'admin', // First user in organization is admin
        organization_id: organization.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError)
      throw profileError
    }

    console.log('👤 Created profile for user:', user.email)

    // No default API key is created here any more. The old insert wrote a
    // predictable plaintext key (sk_live_<user id prefix>_<ms timestamp>) into
    // public.api_keys.key and named a column that does not exist
    // (rate_limited), so it never succeeded. Users create keys through the
    // api-key-create edge function or the auth-gateway, which store only
    // key_hash.

    // Log successful user onboarding
    await supabase
      .from('usage_analytics')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        action: 'user_created',
        resource_type: 'auth',
        metadata: {
          provider: user.app_metadata?.provider || 'email',
          email: user.email,
          created_via: 'auth_hook'
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User profile and organization created successfully',
        organization_id: organization.id 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Auth hook error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error)
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})