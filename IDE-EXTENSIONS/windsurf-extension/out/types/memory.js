"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMemorySchema = exports.updateMemorySchema = exports.createMemorySchema = void 0;
const zod_1 = require("zod");
// Zod schemas for validation
exports.createMemorySchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    content: zod_1.z.string().min(1).max(50000),
    memory_type: zod_1.z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']).default('context'),
    tags: zod_1.z.array(zod_1.z.string().min(1).max(50)).max(10).default([]),
    topic_id: zod_1.z.string().uuid().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
exports.updateMemorySchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    content: zod_1.z.string().min(1).max(50000).optional(),
    memory_type: zod_1.z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']).optional(),
    tags: zod_1.z.array(zod_1.z.string().min(1).max(50)).max(10).optional(),
    topic_id: zod_1.z.string().uuid().nullable().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
exports.searchMemorySchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(1000),
    memory_types: zod_1.z.array(zod_1.z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'])).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    topic_id: zod_1.z.string().uuid().optional(),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    threshold: zod_1.z.number().min(0).max(1).default(0.7)
});
//# sourceMappingURL=memory.js.map