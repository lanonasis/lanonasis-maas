/**
 * MCP Tool Schema Definitions
 * Provides Zod-based validation for all MCP tools
 */
import { z } from 'zod';
export declare const MemoryCreateSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    memory_type: z.ZodDefault<z.ZodEnum<["context", "reference", "note"]>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    topic_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    content?: string;
    tags?: string[];
    topic_id?: string;
    memory_type?: "context" | "reference" | "note";
    metadata?: Record<string, any>;
}, {
    title?: string;
    content?: string;
    tags?: string[];
    topic_id?: string;
    memory_type?: "context" | "reference" | "note";
    metadata?: Record<string, any>;
}>;
export declare const MemorySearchSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodDefault<z.ZodNumber>;
    topic_id: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    memory_type: z.ZodOptional<z.ZodEnum<["context", "reference", "note"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    tags?: string[];
    limit?: number;
    topic_id?: string;
    threshold?: number;
    memory_type?: "context" | "reference" | "note";
}, {
    query?: string;
    tags?: string[];
    limit?: number;
    topic_id?: string;
    threshold?: number;
    memory_type?: "context" | "reference" | "note";
}>;
export declare const MemoryUpdateSchema: z.ZodObject<{
    memory_id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodOptional<z.ZodEnum<["context", "reference", "note"]>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    content?: string;
    tags?: string[];
    memory_id?: string;
    memory_type?: "context" | "reference" | "note";
    metadata?: Record<string, any>;
}, {
    title?: string;
    content?: string;
    tags?: string[];
    memory_id?: string;
    memory_type?: "context" | "reference" | "note";
    metadata?: Record<string, any>;
}>;
export declare const MemoryDeleteSchema: z.ZodObject<{
    memory_id: z.ZodString;
    confirm: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    confirm?: boolean;
    memory_id?: string;
}, {
    confirm?: boolean;
    memory_id?: string;
}>;
export declare const MemoryListSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    topic_id: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    memory_type: z.ZodOptional<z.ZodEnum<["context", "reference", "note"]>>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "updated_at", "title"]>>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    tags?: string[];
    limit?: number;
    topic_id?: string;
    memory_type?: "context" | "reference" | "note";
    offset?: number;
    sort_by?: "title" | "created_at" | "updated_at";
    order?: "desc" | "asc";
}, {
    tags?: string[];
    limit?: number;
    topic_id?: string;
    memory_type?: "context" | "reference" | "note";
    offset?: number;
    sort_by?: "title" | "created_at" | "updated_at";
    order?: "desc" | "asc";
}>;
export declare const TopicCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parent_id: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    color?: string;
    description?: string;
    icon?: string;
    parent_id?: string;
}, {
    name?: string;
    color?: string;
    description?: string;
    icon?: string;
    parent_id?: string;
}>;
export declare const TopicUpdateSchema: z.ZodObject<{
    topic_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    color?: string;
    topic_id?: string;
    description?: string;
    icon?: string;
    parent_id?: string;
}, {
    name?: string;
    color?: string;
    topic_id?: string;
    description?: string;
    icon?: string;
    parent_id?: string;
}>;
export declare const TopicListSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    include_children: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    parent_id?: string;
    include_children?: boolean;
}, {
    limit?: number;
    parent_id?: string;
    include_children?: boolean;
}>;
export declare const ApiKeyCreateSchema: z.ZodObject<{
    name: z.ZodString;
    permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<["read", "write", "delete", "admin"]>, "many">>;
    expires_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    permissions?: ("delete" | "admin" | "read" | "write")[];
    expires_at?: string;
}, {
    name?: string;
    permissions?: ("delete" | "admin" | "read" | "write")[];
    expires_at?: string;
}>;
export declare const ApiKeyRevokeSchema: z.ZodObject<{
    key_id: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string;
    key_id?: string;
}, {
    reason?: string;
    key_id?: string;
}>;
export declare const SystemHealthSchema: z.ZodObject<{
    verbose: z.ZodDefault<z.ZodBoolean>;
    include_dependencies: z.ZodDefault<z.ZodBoolean>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    verbose?: boolean;
    timeout?: number;
    include_dependencies?: boolean;
}, {
    verbose?: boolean;
    timeout?: number;
    include_dependencies?: boolean;
}>;
export declare const SystemConfigSchema: z.ZodObject<{
    action: z.ZodEnum<["get", "set", "reset"]>;
    key: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    scope: z.ZodDefault<z.ZodEnum<["user", "global"]>>;
}, "strip", z.ZodTypeAny, {
    value?: any;
    action?: "get" | "set" | "reset";
    key?: string;
    scope?: "user" | "global";
}, {
    value?: any;
    action?: "get" | "set" | "reset";
    key?: string;
    scope?: "user" | "global";
}>;
export declare const BulkOperationSchema: z.ZodObject<{
    operation: z.ZodEnum<["create", "update", "delete"]>;
    entity_type: z.ZodEnum<["memory", "topic", "apikey"]>;
    items: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">;
    transaction: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    operation?: "create" | "delete" | "update";
    entity_type?: "topic" | "memory" | "apikey";
    items?: Record<string, any>[];
    transaction?: boolean;
}, {
    operation?: "create" | "delete" | "update";
    entity_type?: "topic" | "memory" | "apikey";
    items?: Record<string, any>[];
    transaction?: boolean;
}>;
export declare const ImportExportSchema: z.ZodObject<{
    action: z.ZodEnum<["import", "export"]>;
    format: z.ZodDefault<z.ZodEnum<["json", "csv", "markdown"]>>;
    entity_type: z.ZodDefault<z.ZodEnum<["memory", "topic", "all"]>>;
    file_path: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    action?: "import" | "export";
    format?: "json" | "csv" | "markdown";
    entity_type?: "topic" | "memory" | "all";
    file_path?: string;
    filters?: Record<string, any>;
}, {
    action?: "import" | "export";
    format?: "json" | "csv" | "markdown";
    entity_type?: "topic" | "memory" | "all";
    file_path?: string;
    filters?: Record<string, any>;
}>;
export declare const ToolExecutionSchema: z.ZodObject<{
    tool_name: z.ZodString;
    arguments: z.ZodRecord<z.ZodString, z.ZodAny>;
    timeout: z.ZodDefault<z.ZodNumber>;
    retry_on_failure: z.ZodDefault<z.ZodBoolean>;
    max_retries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout?: number;
    arguments?: Record<string, any>;
    tool_name?: string;
    retry_on_failure?: boolean;
    max_retries?: number;
}, {
    timeout?: number;
    arguments?: Record<string, any>;
    tool_name?: string;
    retry_on_failure?: boolean;
    max_retries?: number;
}>;
export declare const SuccessResponseSchema: z.ZodObject<{
    success: z.ZodDefault<z.ZodBoolean>;
    data: z.ZodAny;
    message: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        duration_ms: z.ZodOptional<z.ZodNumber>;
        request_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp?: string;
        duration_ms?: number;
        request_id?: string;
    }, {
        timestamp?: string;
        duration_ms?: number;
        request_id?: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    success?: boolean;
    message?: string;
    data?: any;
    metadata?: {
        timestamp?: string;
        duration_ms?: number;
        request_id?: string;
    };
}, {
    success?: boolean;
    message?: string;
    data?: any;
    metadata?: {
        timestamp?: string;
        duration_ms?: number;
        request_id?: string;
    };
}>;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodDefault<z.ZodBoolean>;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
        stack: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message?: string;
        code?: string;
        details?: any;
        stack?: string;
    }, {
        message?: string;
        code?: string;
        details?: any;
        stack?: string;
    }>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        request_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp?: string;
        request_id?: string;
    }, {
        timestamp?: string;
        request_id?: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    success?: boolean;
    error?: {
        message?: string;
        code?: string;
        details?: any;
        stack?: string;
    };
    metadata?: {
        timestamp?: string;
        request_id?: string;
    };
}, {
    success?: boolean;
    error?: {
        message?: string;
        code?: string;
        details?: any;
        stack?: string;
    };
    metadata?: {
        timestamp?: string;
        request_id?: string;
    };
}>;
export declare class SchemaValidator {
    /**
     * Validate data against a schema
     */
    static validate<T>(schema: z.ZodSchema<T>, data: unknown): T;
    /**
     * Validate data and return result with errors
     */
    static safeParse<T>(schema: z.ZodSchema<T>, data: unknown): {
        success: true;
        data: T;
    } | {
        success: false;
        errors: string[];
    };
    /**
     * Get schema as JSON Schema for documentation
     */
    static toJsonSchema(_schema: z.ZodSchema<any>): any;
}
export declare const MCPSchemas: {
    memory: {
        create: z.ZodObject<{
            title: z.ZodString;
            content: z.ZodString;
            memory_type: z.ZodDefault<z.ZodEnum<["context", "reference", "note"]>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            topic_id: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            title?: string;
            content?: string;
            tags?: string[];
            topic_id?: string;
            memory_type?: "context" | "reference" | "note";
            metadata?: Record<string, any>;
        }, {
            title?: string;
            content?: string;
            tags?: string[];
            topic_id?: string;
            memory_type?: "context" | "reference" | "note";
            metadata?: Record<string, any>;
        }>;
        search: z.ZodObject<{
            query: z.ZodString;
            limit: z.ZodDefault<z.ZodNumber>;
            threshold: z.ZodDefault<z.ZodNumber>;
            topic_id: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            memory_type: z.ZodOptional<z.ZodEnum<["context", "reference", "note"]>>;
        }, "strip", z.ZodTypeAny, {
            query?: string;
            tags?: string[];
            limit?: number;
            topic_id?: string;
            threshold?: number;
            memory_type?: "context" | "reference" | "note";
        }, {
            query?: string;
            tags?: string[];
            limit?: number;
            topic_id?: string;
            threshold?: number;
            memory_type?: "context" | "reference" | "note";
        }>;
        update: z.ZodObject<{
            memory_id: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            memory_type: z.ZodOptional<z.ZodEnum<["context", "reference", "note"]>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            title?: string;
            content?: string;
            tags?: string[];
            memory_id?: string;
            memory_type?: "context" | "reference" | "note";
            metadata?: Record<string, any>;
        }, {
            title?: string;
            content?: string;
            tags?: string[];
            memory_id?: string;
            memory_type?: "context" | "reference" | "note";
            metadata?: Record<string, any>;
        }>;
        delete: z.ZodObject<{
            memory_id: z.ZodString;
            confirm: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            confirm?: boolean;
            memory_id?: string;
        }, {
            confirm?: boolean;
            memory_id?: string;
        }>;
        list: z.ZodObject<{
            limit: z.ZodDefault<z.ZodNumber>;
            offset: z.ZodDefault<z.ZodNumber>;
            topic_id: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            memory_type: z.ZodOptional<z.ZodEnum<["context", "reference", "note"]>>;
            sort_by: z.ZodDefault<z.ZodEnum<["created_at", "updated_at", "title"]>>;
            order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
        }, "strip", z.ZodTypeAny, {
            tags?: string[];
            limit?: number;
            topic_id?: string;
            memory_type?: "context" | "reference" | "note";
            offset?: number;
            sort_by?: "title" | "created_at" | "updated_at";
            order?: "desc" | "asc";
        }, {
            tags?: string[];
            limit?: number;
            topic_id?: string;
            memory_type?: "context" | "reference" | "note";
            offset?: number;
            sort_by?: "title" | "created_at" | "updated_at";
            order?: "desc" | "asc";
        }>;
    };
    topic: {
        create: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            parent_id: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            color?: string;
            description?: string;
            icon?: string;
            parent_id?: string;
        }, {
            name?: string;
            color?: string;
            description?: string;
            icon?: string;
            parent_id?: string;
        }>;
        update: z.ZodObject<{
            topic_id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            color: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            color?: string;
            topic_id?: string;
            description?: string;
            icon?: string;
            parent_id?: string;
        }, {
            name?: string;
            color?: string;
            topic_id?: string;
            description?: string;
            icon?: string;
            parent_id?: string;
        }>;
        list: z.ZodObject<{
            limit: z.ZodDefault<z.ZodNumber>;
            parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            include_children: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            limit?: number;
            parent_id?: string;
            include_children?: boolean;
        }, {
            limit?: number;
            parent_id?: string;
            include_children?: boolean;
        }>;
    };
    apikey: {
        create: z.ZodObject<{
            name: z.ZodString;
            permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<["read", "write", "delete", "admin"]>, "many">>;
            expires_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            permissions?: ("delete" | "admin" | "read" | "write")[];
            expires_at?: string;
        }, {
            name?: string;
            permissions?: ("delete" | "admin" | "read" | "write")[];
            expires_at?: string;
        }>;
        revoke: z.ZodObject<{
            key_id: z.ZodString;
            reason: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            reason?: string;
            key_id?: string;
        }, {
            reason?: string;
            key_id?: string;
        }>;
    };
    system: {
        health: z.ZodObject<{
            verbose: z.ZodDefault<z.ZodBoolean>;
            include_dependencies: z.ZodDefault<z.ZodBoolean>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            verbose?: boolean;
            timeout?: number;
            include_dependencies?: boolean;
        }, {
            verbose?: boolean;
            timeout?: number;
            include_dependencies?: boolean;
        }>;
        config: z.ZodObject<{
            action: z.ZodEnum<["get", "set", "reset"]>;
            key: z.ZodOptional<z.ZodString>;
            value: z.ZodOptional<z.ZodAny>;
            scope: z.ZodDefault<z.ZodEnum<["user", "global"]>>;
        }, "strip", z.ZodTypeAny, {
            value?: any;
            action?: "get" | "set" | "reset";
            key?: string;
            scope?: "user" | "global";
        }, {
            value?: any;
            action?: "get" | "set" | "reset";
            key?: string;
            scope?: "user" | "global";
        }>;
    };
    operations: {
        bulk: z.ZodObject<{
            operation: z.ZodEnum<["create", "update", "delete"]>;
            entity_type: z.ZodEnum<["memory", "topic", "apikey"]>;
            items: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">;
            transaction: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            operation?: "create" | "delete" | "update";
            entity_type?: "topic" | "memory" | "apikey";
            items?: Record<string, any>[];
            transaction?: boolean;
        }, {
            operation?: "create" | "delete" | "update";
            entity_type?: "topic" | "memory" | "apikey";
            items?: Record<string, any>[];
            transaction?: boolean;
        }>;
        importExport: z.ZodObject<{
            action: z.ZodEnum<["import", "export"]>;
            format: z.ZodDefault<z.ZodEnum<["json", "csv", "markdown"]>>;
            entity_type: z.ZodDefault<z.ZodEnum<["memory", "topic", "all"]>>;
            file_path: z.ZodOptional<z.ZodString>;
            filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            action?: "import" | "export";
            format?: "json" | "csv" | "markdown";
            entity_type?: "topic" | "memory" | "all";
            file_path?: string;
            filters?: Record<string, any>;
        }, {
            action?: "import" | "export";
            format?: "json" | "csv" | "markdown";
            entity_type?: "topic" | "memory" | "all";
            file_path?: string;
            filters?: Record<string, any>;
        }>;
        toolExecution: z.ZodObject<{
            tool_name: z.ZodString;
            arguments: z.ZodRecord<z.ZodString, z.ZodAny>;
            timeout: z.ZodDefault<z.ZodNumber>;
            retry_on_failure: z.ZodDefault<z.ZodBoolean>;
            max_retries: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout?: number;
            arguments?: Record<string, any>;
            tool_name?: string;
            retry_on_failure?: boolean;
            max_retries?: number;
        }, {
            timeout?: number;
            arguments?: Record<string, any>;
            tool_name?: string;
            retry_on_failure?: boolean;
            max_retries?: number;
        }>;
    };
    responses: {
        success: z.ZodObject<{
            success: z.ZodDefault<z.ZodBoolean>;
            data: z.ZodAny;
            message: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodObject<{
                timestamp: z.ZodString;
                duration_ms: z.ZodOptional<z.ZodNumber>;
                request_id: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                timestamp?: string;
                duration_ms?: number;
                request_id?: string;
            }, {
                timestamp?: string;
                duration_ms?: number;
                request_id?: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            success?: boolean;
            message?: string;
            data?: any;
            metadata?: {
                timestamp?: string;
                duration_ms?: number;
                request_id?: string;
            };
        }, {
            success?: boolean;
            message?: string;
            data?: any;
            metadata?: {
                timestamp?: string;
                duration_ms?: number;
                request_id?: string;
            };
        }>;
        error: z.ZodObject<{
            success: z.ZodDefault<z.ZodBoolean>;
            error: z.ZodObject<{
                code: z.ZodString;
                message: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
                stack: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                message?: string;
                code?: string;
                details?: any;
                stack?: string;
            }, {
                message?: string;
                code?: string;
                details?: any;
                stack?: string;
            }>;
            metadata: z.ZodOptional<z.ZodObject<{
                timestamp: z.ZodString;
                request_id: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                timestamp?: string;
                request_id?: string;
            }, {
                timestamp?: string;
                request_id?: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            success?: boolean;
            error?: {
                message?: string;
                code?: string;
                details?: any;
                stack?: string;
            };
            metadata?: {
                timestamp?: string;
                request_id?: string;
            };
        }, {
            success?: boolean;
            error?: {
                message?: string;
                code?: string;
                details?: any;
                stack?: string;
            };
            metadata?: {
                timestamp?: string;
                request_id?: string;
            };
        }>;
    };
};
export default MCPSchemas;
