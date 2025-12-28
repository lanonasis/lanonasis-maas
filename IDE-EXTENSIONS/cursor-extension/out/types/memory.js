"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMemorySchema = exports.updateMemorySchema = exports.createMemorySchema = void 0;
const zod_1 = require("zod");
const ide_extension_core_1 = require("@lanonasis/ide-extension-core");
// Zod schemas for validation
const coreCreate = ide_extension_core_1.CreateMemoryRequestSchema.shape;
exports.createMemorySchema = zod_1.z.object({
    title: coreCreate.title,
    content: coreCreate.content,
    memory_type: ide_extension_core_1.MemoryType.default('context'),
    tags: coreCreate.tags,
    topic_id: zod_1.z.string().uuid().optional(),
    metadata: coreCreate.metadata
});
const coreUpdate = ide_extension_core_1.UpdateMemoryRequestSchema.shape;
exports.updateMemorySchema = zod_1.z.object({
    title: coreUpdate.title,
    content: coreUpdate.content,
    memory_type: ide_extension_core_1.MemoryType.optional(),
    tags: coreUpdate.tags,
    topic_id: zod_1.z.string().uuid().nullable().optional(),
    metadata: coreUpdate.metadata
});
const coreSearch = ide_extension_core_1.SearchMemoryRequestSchema.shape;
exports.searchMemorySchema = zod_1.z.object({
    query: coreSearch.query,
    memory_types: zod_1.z.array(ide_extension_core_1.MemoryType).optional(),
    tags: coreSearch.tags,
    topic_id: zod_1.z.string().uuid().optional(),
    limit: coreSearch.limit,
    threshold: coreSearch.threshold
});
//# sourceMappingURL=memory.js.map