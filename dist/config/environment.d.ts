export declare const config: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    HOST: string;
    SUPABASE_URL=https://<project-ref>.supabase.co
    SUPABASE_KEY: string;
    SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
    JWT_SECRET=REDACTED_JWT_SECRET
    JWT_EXPIRES_IN: string;
    OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
    LOG_LEVEL: "error" | "warn" | "info" | "debug";
    LOG_FORMAT: "json" | "simple";
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    API_VERSION: string;
    API_PREFIX: string;
    ENABLE_METRICS: boolean;
    METRICS_PORT: number;
    REDIS_URL?: string | undefined;
};
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
//# sourceMappingURL=environment.d.ts.map