interface UserProfile {
    email: string;
    organization_id: string;
    role: string;
    plan: string;
}
export declare class CLIConfig {
    private configDir;
    private configPath;
    private config;
    constructor();
    init(): Promise<void>;
    load(): Promise<void>;
    save(): Promise<void>;
    getApiUrl(): string;
    setApiUrl(url: string): Promise<void>;
    setToken(token: string): Promise<void>;
    getToken(): string | undefined;
    getCurrentUser(): Promise<UserProfile | undefined>;
    isAuthenticated(): Promise<boolean>;
    logout(): Promise<void>;
    clear(): Promise<void>;
    getConfigPath(): string;
    exists(): Promise<boolean>;
}
export {};
