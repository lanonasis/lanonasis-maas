import { z } from 'zod';

/**
 * Extension Configuration Schema
 */
export const ExtensionConfigSchema = z.object({
  // API Configuration
  apiUrl: z.string().url().default('https://api.lanonasis.com'),
  authUrl: z.string().url().default('https://auth.lanonasis.com'),
  
  // CLI Integration
  enableCliIntegration: z.boolean().default(true),
  cliDetectionTimeout: z.number().int().min(100).max(5000).default(1000),
  
  // Memory Settings
  defaultMemoryType: z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']).default('context'),
  searchLimit: z.number().int().min(1).max(100).default(10),
  searchThreshold: z.number().min(0).max(1).default(0.7),
  
  // Performance Settings
  cacheEnabled: z.boolean().default(true),
  cacheTtlMinutes: z.number().int().min(1).max(60).default(5),
  virtualScrollThreshold: z.number().int().min(10).max(1000).default(50),
  
  // UI Settings
  enableAccessibilityFeatures: z.boolean().default(true),
  showRelevanceScores: z.boolean().default(true),
  highlightMatchingTerms: z.boolean().default(true),
  
  // Offline Settings
  enableOfflineMode: z.boolean().default(true),
  offlineQueueMaxSize: z.number().int().min(10).max(1000).default(100),
  
  // Telemetry Settings
  enableTelemetry: z.boolean().default(false),
  
  // Advanced Settings
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  enableDiagnostics: z.boolean().default(false)
});

export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

/**
 * Branding Configuration
 */
export interface BrandingConfig {
  ideName: 'VSCode' | 'Cursor' | 'Windsurf';
  extensionName: string;
  extensionDisplayName: string;
  commandPrefix: string;
  userAgent: string;
}

/**
 * Authentication Configuration
 */
export interface AuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}
