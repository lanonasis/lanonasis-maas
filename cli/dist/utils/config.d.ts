interface UserProfile {
    email: string;
    organization_id: string;
    role: string;
    plan: string;
}
interface CLIConfigData {
    version?: string;
    apiUrl?: string;
    token?: string | undefined;
    user?: UserProfile | undefined;
    lastUpdated?: string;
    mcpServerPath?: string;
    mcpServerUrl?: string;
    mcpUseRemote?: boolean;
    mcpPreference?: 'local' | 'remote' | 'websocket' | 'auto';
    discoveredServices?: {
        auth_base: string;
        memory_base: string;
        mcp_base?: string;
        mcp_ws_base: string;
        mcp_sse_base?: string;
        project_scope: string;
    };
    lastServiceDiscovery?: string;
    manualEndpointOverrides?: boolean;
    lastManualEndpointUpdate?: string;
    vendorKey?: string | undefined;
    authMethod?: 'jwt' | 'vendor_key' | 'oauth' | undefined;
    tokenExpiry?: number | undefined;
    lastValidated?: string | undefined;
    deviceId?: string;
    authFailureCount?: number;
    lastAuthFailure?: string | undefined;
    [key: string]: unknown;
}
export declare class CLIConfig {
    private configDir;
    private configPath;
    private config;
    private lockFile;
    private static readonly CONFIG_VERSION;
    private authCheckCache;
    private readonly AUTH_CACHE_TTL;
    private apiKeyStorage;
    constructor();
    /**
     * Overrides the configuration storage directory. Primarily used for tests.
     */
    setConfigDirectory(configDir: string): void;
    /**
     * Exposes the current config path for tests and diagnostics.
     */
    getConfigPath(): string;
    init(): Promise<void>;
    load(): Promise<void>;
    private migrateConfigIfNeeded;
    save(): Promise<void>;
    atomicSave(): Promise<void>;
    backupConfig(): Promise<string>;
    private acquireLock;
    private releaseLock;
    getApiUrl(): string;
    getApiUrlsWithFallbacks(): string[];
    discoverServices(verbose?: boolean): Promise<void>;
    private handleServiceDiscoveryFailure;
    private categorizeServiceDiscoveryError;
    private resolveFallbackEndpoints;
    private logFallbackUsage;
    private pingAuthHealth;
    setManualEndpoints(endpoints: Partial<CLIConfigData['discoveredServices']>): Promise<void>;
    hasManualEndpointOverrides(): boolean;
    clearManualEndpointOverrides(): Promise<void>;
    getDiscoveredApiUrl(): string;
    setVendorKey(vendorKey: string): Promise<void>;
    validateVendorKeyFormat(vendorKey: string): string | boolean;
    private validateVendorKeyWithServer;
    getVendorKey(): string | undefined;
    /**
     * Synchronous wrapper for async retrieve operation
     * Note: ApiKeyStorage.retrieve() is async but we need sync for existing code
     */
    private getVendorKeySync;
    /**
     * Async method to get vendor key from secure storage
     */
    getVendorKeyAsync(): Promise<string | undefined>;
    hasVendorKey(): boolean;
    setApiUrl(url: string): Promise<void>;
    setToken(token: string): Promise<void>;
    getToken(): string | undefined;
    getCurrentUser(): Promise<UserProfile | undefined>;
    isAuthenticated(): Promise<boolean>;
    logout(): Promise<void>;
    clear(): Promise<void>;
    exists(): Promise<boolean>;
    validateStoredCredentials(): Promise<boolean>;
    refreshTokenIfNeeded(): Promise<void>;
    clearInvalidCredentials(): Promise<void>;
    incrementFailureCount(): Promise<void>;
    resetFailureCount(): Promise<void>;
    getFailureCount(): number;
    getLastAuthFailure(): string | undefined;
    shouldDelayAuth(): boolean;
    getAuthDelayMs(): number;
    getDeviceId(): Promise<string>;
    get<T = unknown>(key: string): T;
    set(key: string, value: unknown): void;
    setAndSave(key: string, value: unknown): Promise<void>;
    getMCPServerPath(): string;
    getMCPServerUrl(): string;
    getMCPRestUrl(): string;
    getMCPSSEUrl(): string;
    shouldUseRemoteMCP(): boolean;
}
export {};
