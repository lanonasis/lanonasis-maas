/**
 * MCP Tool Schema Definitions
 * Provides Zod-based validation for all MCP tools
 */

import { z } from 'zod';

// Memory schemas
export const MemoryCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .describe("Memory title"),
  content: z.string()
    .min(1, 'Content is required')
    .describe("Memory content"),
  memory_type: z.enum(["context", "reference", "note"])
    .default("context")
    .describe("Type of memory"),
  tags: z.array(z.string())
    .optional()
    .describe("Optional tags for categorization"),
  topic_id: z.string()
    .uuid()
    .optional()
    .describe("Optional topic ID for organization"),
  metadata: z.record(z.any())
    .optional()
    .describe("Additional metadata")
});

export const MemorySearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .describe("Search query for semantic search"),
  limit: z.number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .describe("Maximum number of results"),
  threshold: z.number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe("Similarity threshold (0-1)"),
  topic_id: z.string()
    .uuid()
    .optional()
    .describe("Filter by topic ID"),
  tags: z.array(z.string())
    .optional()
    .describe("Filter by tags"),
  memory_type: z.enum(["context", "reference", "note"])
    .optional()
    .describe("Filter by memory type")
});

export const MemoryUpdateSchema = z.object({
  memory_id: z.string()
    .uuid()
    .describe("Memory ID to update"),
  title: z.string()
    .min(1)
    .max(200)
    .optional()
    .describe("New title"),
  content: z.string()
    .min(1)
    .optional()
    .describe("New content"),
  memory_type: z.enum(["context", "reference", "note"])
    .optional()
    .describe("New memory type"),
  tags: z.array(z.string())
    .optional()
    .describe("New tags (replaces existing)"),
  metadata: z.record(z.any())
    .optional()
    .describe("New metadata (merges with existing)")
});

export const MemoryDeleteSchema = z.object({
  memory_id: z.string()
    .uuid()
    .describe("Memory ID to delete"),
  confirm: z.boolean()
    .default(false)
    .describe("Confirmation flag for deletion")
});

export const MemoryListSchema = z.object({
  limit: z.number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe("Maximum number of results"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Pagination offset"),
  topic_id: z.string()
    .uuid()
    .optional()
    .describe("Filter by topic ID"),
  tags: z.array(z.string())
    .optional()
    .describe("Filter by tags"),
  memory_type: z.enum(["context", "reference", "note"])
    .optional()
    .describe("Filter by memory type"),
  sort_by: z.enum(["created_at", "updated_at", "title"])
    .default("created_at")
    .describe("Sort field"),
  order: z.enum(["asc", "desc"])
    .default("desc")
    .describe("Sort order")
});

// Topic schemas
export const TopicCreateSchema = z.object({
  name: z.string()
    .min(1, 'Topic name is required')
    .max(100, 'Topic name must be less than 100 characters')
    .describe("Topic name"),
  description: z.string()
    .max(500)
    .optional()
    .describe("Topic description"),
  parent_id: z.string()
    .uuid()
    .optional()
    .describe("Parent topic ID for nesting"),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .describe("Topic color in hex format"),
  icon: z.string()
    .optional()
    .describe("Topic icon identifier")
});

export const TopicUpdateSchema = z.object({
  topic_id: z.string()
    .uuid()
    .describe("Topic ID to update"),
  name: z.string()
    .min(1)
    .max(100)
    .optional()
    .describe("New name"),
  description: z.string()
    .max(500)
    .optional()
    .describe("New description"),
  parent_id: z.string()
    .uuid()
    .nullable()
    .optional()
    .describe("New parent topic ID"),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .describe("New color"),
  icon: z.string()
    .optional()
    .describe("New icon")
});

export const TopicListSchema = z.object({
  limit: z.number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe("Maximum number of results"),
  parent_id: z.string()
    .uuid()
    .nullable()
    .optional()
    .describe("Filter by parent topic (null for root topics)"),
  include_children: z.boolean()
    .default(false)
    .describe("Include child topics in results")
});

// API Key schemas
export const ApiKeyCreateSchema = z.object({
  name: z.string()
    .min(1, 'API key name is required')
    .max(100, 'Name must be less than 100 characters')
    .describe("API key name for identification"),
  permissions: z.array(
    z.enum(["read", "write", "delete", "admin"])
  )
    .default(["read"])
    .describe("Permissions for the API key"),
  expires_at: z.string()
    .datetime()
    .optional()
    .describe("Optional expiration date (ISO 8601)")
});

export const ApiKeyRevokeSchema = z.object({
  key_id: z.string()
    .describe("API key ID to revoke"),
  reason: z.string()
    .optional()
    .describe("Reason for revocation")
});

// System schemas
export const SystemHealthSchema = z.object({
  verbose: z.boolean()
    .default(false)
    .describe("Include detailed diagnostics"),
  include_dependencies: z.boolean()
    .default(true)
    .describe("Check dependency health"),
  timeout: z.number()
    .positive()
    .default(5000)
    .describe("Health check timeout in milliseconds")
});

export const SystemConfigSchema = z.object({
  action: z.enum(["get", "set", "reset"])
    .describe("Configuration action"),
  key: z.string()
    .optional()
    .describe("Configuration key (required for set/get specific)"),
  value: z.any()
    .optional()
    .describe("Configuration value (required for set)"),
  scope: z.enum(["user", "global"])
    .default("user")
    .describe("Configuration scope")
});

// Advanced operation schemas
export const BulkOperationSchema = z.object({
  operation: z.enum(["create", "update", "delete"])
    .describe("Bulk operation type"),
  entity_type: z.enum(["memory", "topic", "apikey"])
    .describe("Entity type for bulk operation"),
  items: z.array(z.record(z.any()))
    .min(1)
    .max(100)
    .describe("Items for bulk operation"),
  transaction: z.boolean()
    .default(true)
    .describe("Execute as transaction (all or nothing)")
});

export const ImportExportSchema = z.object({
  action: z.enum(["import", "export"])
    .describe("Import or export action"),
  format: z.enum(["json", "csv", "markdown"])
    .default("json")
    .describe("Data format"),
  entity_type: z.enum(["memory", "topic", "all"])
    .default("all")
    .describe("Entity type to import/export"),
  file_path: z.string()
    .optional()
    .describe("File path for import/export"),
  filters: z.record(z.any())
    .optional()
    .describe("Filters for export")
});

// Tool execution schema
export const ToolExecutionSchema = z.object({
  tool_name: z.string()
    .describe("Name of the tool to execute"),
  arguments: z.record(z.any())
    .describe("Tool arguments"),
  timeout: z.number()
    .positive()
    .default(30000)
    .describe("Execution timeout in milliseconds"),
  retry_on_failure: z.boolean()
    .default(false)
    .describe("Retry on failure"),
  max_retries: z.number()
    .int()
    .min(0)
    .max(5)
    .default(3)
    .describe("Maximum retry attempts")
});

// Response schemas
export const SuccessResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.any(),
  message: z.string().optional(),
  metadata: z.object({
    timestamp: z.string().datetime(),
    duration_ms: z.number().optional(),
    request_id: z.string().optional()
  }).optional()
});

export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    stack: z.string().optional()
  }),
  metadata: z.object({
    timestamp: z.string().datetime(),
    request_id: z.string().optional()
  }).optional()
});

// Validation helper
export class SchemaValidator {
  /**
   * Validate data against a schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.errors
            .map(e => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Validate data and return result with errors
   */
  static safeParse<T>(
    schema: z.ZodSchema<T>, 
    data: unknown
  ): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.errors.map(
          e => `${e.path.join('.')}: ${e.message}`
        )
      };
    }
  }

  /**
   * Get schema as JSON Schema for documentation
   */
  static toJsonSchema(_schema: z.ZodSchema<any>): any {
    // This would require zodToJsonSchema package
    // For now, return a simplified version
    return {
      type: 'object',
      description: 'Schema definition',
      // Additional implementation needed
    };
  }
}

// Export all schemas as a collection
export const MCPSchemas = {
  memory: {
    create: MemoryCreateSchema,
    search: MemorySearchSchema,
    update: MemoryUpdateSchema,
    delete: MemoryDeleteSchema,
    list: MemoryListSchema
  },
  topic: {
    create: TopicCreateSchema,
    update: TopicUpdateSchema,
    list: TopicListSchema
  },
  apikey: {
    create: ApiKeyCreateSchema,
    revoke: ApiKeyRevokeSchema
  },
  system: {
    health: SystemHealthSchema,
    config: SystemConfigSchema
  },
  operations: {
    bulk: BulkOperationSchema,
    importExport: ImportExportSchema,
    toolExecution: ToolExecutionSchema
  },
  responses: {
    success: SuccessResponseSchema,
    error: ErrorResponseSchema
  }
};

export default MCPSchemas;
