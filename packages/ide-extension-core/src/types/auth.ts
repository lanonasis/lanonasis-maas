/**
 * Authentication Types
 */

/**
 * Credential Type
 */
export type CredentialType = 'oauth' | 'apiKey';

/**
 * Stored Credential
 */
export interface StoredCredential {
  type: CredentialType;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * OAuth Token
 */
export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type: string;
  scope: string;
}

/**
 * PKCE Parameters
 */
export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Authentication Status
 */
export interface AuthStatus {
  isAuthenticated: boolean;
  credentialType?: CredentialType;
  expiresAt?: number;
  needsRefresh?: boolean;
}

/**
 * Secure API Key Service Interface
 */
export interface ISecureAuthService {
  /**
   * Initialize the service and perform migrations
   */
  initialize(): Promise<void>;
  
  /**
   * Get API key or token, prompting if needed
   */
  getApiKeyOrPrompt(): Promise<string | null>;
  
  /**
   * Get API key from secure storage
   */
  getApiKey(): Promise<string | null>;
  
  /**
   * Check if API key is configured
   */
  hasApiKey(): Promise<boolean>;
  
  /**
   * Store API key in secure storage
   */
  storeApiKey(apiKey: string, type?: CredentialType): Promise<void>;
  
  /**
   * Get stored credentials with type information
   */
  getStoredCredentials(): Promise<StoredCredential | null>;
  
  /**
   * Authenticate using OAuth flow
   */
  authenticateWithOAuth(): Promise<boolean>;
  
  /**
   * Authenticate using API key
   */
  authenticateWithApiKey(apiKey: string): Promise<boolean>;
  
  /**
   * Refresh OAuth token
   */
  refreshToken(): Promise<boolean>;
  
  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): Promise<boolean>;
  
  /**
   * Clear all stored credentials
   */
  clearCredentials(): Promise<void>;
  
  /**
   * Get authentication status
   */
  getAuthStatus(): Promise<AuthStatus>;
  
  /**
   * Migrate from legacy storage
   */
  migrateFromLegacyStorage(): Promise<boolean>;
}
