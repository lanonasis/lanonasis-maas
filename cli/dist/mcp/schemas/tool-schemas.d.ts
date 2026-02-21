/**
 * MCP Tool Schema Definitions
 * Provides Zod-based validation for all MCP tools
 */
import { z } from 'zod';
export declare const MemoryCreateSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    memory_type: z.ZodDefault<z.ZodEnum<{
        context: "context";
        reference: "reference";
        note: "note";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    topic_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export declare const MemorySearchSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodDefault<z.ZodNumber>;
    topic_id: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    memory_type: z.ZodOptional<z.ZodEnum<{
        context: "context";
        reference: "reference";
        note: "note";
    }>>;
}, z.core.$strip>;
export declare const MemoryUpdateSchema: z.ZodObject<{
    memory_id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodOptional<z.ZodEnum<{
        context: "context";
        reference: "reference";
        note: "note";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export declare const MemoryDeleteSchema: z.ZodObject<{
    memory_id: z.ZodString;
    confirm: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const MemoryListSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    topic_id: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    memory_type: z.ZodOptional<z.ZodEnum<{
        context: "context";
        reference: "reference";
        note: "note";
    }>>;
    sort_by: z.ZodDefault<z.ZodEnum<{
        title: "title";
        created_at: "created_at";
        updated_at: "updated_at";
    }>>;
    order: z.ZodDefault<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>;
}, z.core.$strip>;
export declare const TopicCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parent_id: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const TopicUpdateSchema: z.ZodObject<{
    topic_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const TopicListSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    include_children: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ApiKeyCreateSchema: z.ZodObject<{
    name: z.ZodString;
    permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<{
        delete: "delete";
        admin: "admin";
        read: "read";
        write: "write";
    }>>>;
    expires_at: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ApiKeyRevokeSchema: z.ZodObject<{
    key_id: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SystemHealthSchema: z.ZodObject<{
    verbose: z.ZodDefault<z.ZodBoolean>;
    include_dependencies: z.ZodDefault<z.ZodBoolean>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const SystemConfigSchema: z.ZodObject<{
    action: z.ZodEnum<{
        get: "get";
        set: "set";
        reset: "reset";
    }>;
    key: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    scope: z.ZodDefault<z.ZodEnum<{
        user: "user";
        global: "global";
    }>>;
}, z.core.$strip>;
export declare const BulkOperationSchema: z.ZodObject<{
    operation: z.ZodEnum<{
        create: "create";
        delete: "delete";
        update: "update";
    }>;
    entity_type: z.ZodEnum<{
        topic: "topic";
        memory: "memory";
        apikey: "apikey";
    }>;
    items: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>>;
    transaction: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ImportExportSchema: z.ZodObject<{
    action: z.ZodEnum<{
        import: "import";
        export: "export";
    }>;
    format: z.ZodDefault<z.ZodEnum<{
        json: "json";
        csv: "csv";
        markdown: "markdown";
    }>>;
    entity_type: z.ZodDefault<z.ZodEnum<{
        topic: "topic";
        memory: "memory";
        all: "all";
    }>>;
    file_path: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export declare const ToolExecutionSchema: z.ZodObject<{
    tool_name: z.ZodString;
    arguments: z.ZodRecord<z.ZodString, z.ZodAny>;
    timeout: z.ZodDefault<z.ZodNumber>;
    retry_on_failure: z.ZodDefault<z.ZodBoolean>;
    max_retries: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const SuccessResponseSchema: z.ZodObject<{
    success: z.ZodDefault<z.ZodBoolean>;
    data: z.ZodAny;
    message: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        duration_ms: z.ZodOptional<z.ZodNumber>;
        request_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodDefault<z.ZodBoolean>;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
        stack: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        request_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
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
            memory_type: z.ZodDefault<z.ZodEnum<{
                context: "context";
                reference: "reference";
                note: "note";
            }>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            topic_id: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>;
        search: z.ZodObject<{
            query: z.ZodString;
            limit: z.ZodDefault<z.ZodNumber>;
            threshold: z.ZodDefault<z.ZodNumber>;
            topic_id: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            memory_type: z.ZodOptional<z.ZodEnum<{
                context: "context";
                reference: "reference";
                note: "note";
            }>>;
        }, z.core.$strip>;
        update: z.ZodObject<{
            memory_id: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            memory_type: z.ZodOptional<z.ZodEnum<{
                context: "context";
                reference: "reference";
                note: "note";
            }>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>;
        delete: z.ZodObject<{
            memory_id: z.ZodString;
            confirm: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
        list: z.ZodObject<{
            limit: z.ZodDefault<z.ZodNumber>;
            offset: z.ZodDefault<z.ZodNumber>;
            topic_id: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            memory_type: z.ZodOptional<z.ZodEnum<{
                context: "context";
                reference: "reference";
                note: "note";
            }>>;
            sort_by: z.ZodDefault<z.ZodEnum<{
                title: "title";
                created_at: "created_at";
                updated_at: "updated_at";
            }>>;
            order: z.ZodDefault<z.ZodEnum<{
                desc: "desc";
                asc: "asc";
            }>>;
        }, z.core.$strip>;
    };
    topic: {
        create: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            parent_id: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        update: z.ZodObject<{
            topic_id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            color: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        list: z.ZodObject<{
            limit: z.ZodDefault<z.ZodNumber>;
            parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            include_children: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
    };
    apikey: {
        create: z.ZodObject<{
            name: z.ZodString;
            permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<{
                delete: "delete";
                admin: "admin";
                read: "read";
                write: "write";
            }>>>;
            expires_at: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        revoke: z.ZodObject<{
            key_id: z.ZodString;
            reason: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    };
    system: {
        health: z.ZodObject<{
            verbose: z.ZodDefault<z.ZodBoolean>;
            include_dependencies: z.ZodDefault<z.ZodBoolean>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        config: z.ZodObject<{
            action: z.ZodEnum<{
                get: "get";
                set: "set";
                reset: "reset";
            }>;
            key: z.ZodOptional<z.ZodString>;
            value: z.ZodOptional<z.ZodAny>;
            scope: z.ZodDefault<z.ZodEnum<{
                user: "user";
                global: "global";
            }>>;
        }, z.core.$strip>;
    };
    operations: {
        bulk: z.ZodObject<{
            operation: z.ZodEnum<{
                create: "create";
                delete: "delete";
                update: "update";
            }>;
            entity_type: z.ZodEnum<{
                topic: "topic";
                memory: "memory";
                apikey: "apikey";
            }>;
            items: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>>;
            transaction: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
        importExport: z.ZodObject<{
            action: z.ZodEnum<{
                import: "import";
                export: "export";
            }>;
            format: z.ZodDefault<z.ZodEnum<{
                json: "json";
                csv: "csv";
                markdown: "markdown";
            }>>;
            entity_type: z.ZodDefault<z.ZodEnum<{
                topic: "topic";
                memory: "memory";
                all: "all";
            }>>;
            file_path: z.ZodOptional<z.ZodString>;
            filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>;
        toolExecution: z.ZodObject<{
            tool_name: z.ZodString;
            arguments: z.ZodRecord<z.ZodString, z.ZodAny>;
            timeout: z.ZodDefault<z.ZodNumber>;
            retry_on_failure: z.ZodDefault<z.ZodBoolean>;
            max_retries: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
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
            }, z.core.$strip>>;
        }, z.core.$strip>;
        error: z.ZodObject<{
            success: z.ZodDefault<z.ZodBoolean>;
            error: z.ZodObject<{
                code: z.ZodString;
                message: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
                stack: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            metadata: z.ZodOptional<z.ZodObject<{
                timestamp: z.ZodString;
                request_id: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
    };
};
export default MCPSchemas;
