/**
 * Unified Routing Configuration
 * Routes orchestrator calls through VPS unified router to Supabase
 */

export interface RoutingConfig {
  useUnifiedRouter: boolean;
  unifiedRouterUrl: string;
  fallbackToDirectSupabase: boolean;
  supabaseUrl: string;
  routingMap: Record<string, string>;
}

export const routingConfig: RoutingConfig = {
  // Enable unified router for privacy-protected routing
  useUnifiedRouter: process.env.USE_UNIFIED_ROUTER === 'true' || process.env.NODE_ENV === 'production',
  
  // VPS unified router endpoints
  unifiedRouterUrl: process.env.UNIFIED_ROUTER_URL || 'https://api.vortexai.io',
  
  // Fallback to direct Supabase if unified router fails
  fallbackToDirectSupabase: true,
  
  // Direct Supabase URL for fallback
  supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  
  // Service routing map - orchestrator actions to unified router endpoints
  routingMap: {
    // AI services through unified router
    'ai-chat': '/api/ai-chat',
    'ai-embedding': '/api/generate-embedding',
    'ai-summary': '/api/generate-summary',
    'ai-tags': '/api/extract-tags',
    
    // Media services through unified router  
    'tts': '/api/text-to-speech',
    'stt': '/api/speech-to-text',
    'transcribe': '/api/transcribe',
    
    // Memory operations - can be direct or through router
    'memory-search': '/api/v1/memory/search',
    'memory-create': '/api/v1/memory',
    'memory-update': '/api/v1/memory',
    'memory-delete': '/api/v1/memory',
    
    // MCP tools through unified router
    'mcp': '/api/mcp-handler'
  }
};

/**
 * Get the appropriate endpoint URL for a service
 */
export function getServiceEndpoint(service: string): string {
  const config = routingConfig;
  
  if (config.useUnifiedRouter && config.routingMap[service]) {
    return `${config.unifiedRouterUrl}${config.routingMap[service]}`;
  }
  
  // Default to direct Supabase for non-mapped services
  return config.supabaseUrl;
}

/**
 * Check if service should use unified router
 */
export function shouldUseUnifiedRouter(service: string): boolean {
  return routingConfig.useUnifiedRouter && routingConfig.routingMap[service] !== undefined;
}

/**
 * Get headers for unified router requests
 */
export function getUnifiedRouterHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Service': 'lanonasis-maas',
    'X-Client': 'orchestrator',
    'User-Agent': 'Lanonasis-Orchestrator/1.0'
  };
}