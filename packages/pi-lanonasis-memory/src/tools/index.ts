/**
 * tools/index.ts — barrel export for the four memory_* tools.
 *
 * PR4 ships four tools; each lives in its own file so the test suite can
 * exercise the pure helpers (addMemory, searchMemory, replaceMemory,
 * removeMemory) without spinning up an ExtensionAPI. The barrel re-exports
 * the pure helpers, the ToolDefinition builders, and the convenience
 * register* helpers for use from src/index.ts.
 */

export {
  buildMemoryAddTool,
  registerMemoryAddTool,
  addMemory,
  memoryAddParams,
  type MemoryAddParams,
  type MemoryAddDetails,
} from "./memory_add.js";

export {
  buildMemorySearchTool,
  registerMemorySearchTool,
  searchMemory,
  memorySearchParams,
  type MemorySearchParams,
  type MemorySearchDetails,
} from "./memory_search.js";

export {
  buildMemoryReplaceTool,
  registerMemoryReplaceTool,
  replaceMemory,
  memoryReplaceParams,
  type MemoryReplaceParams,
  type MemoryReplaceDetails,
} from "./memory_replace.js";

export {
  buildMemoryRemoveTool,
  registerMemoryRemoveTool,
  removeMemory,
  memoryRemoveParams,
  type MemoryRemoveParams,
  type MemoryRemoveDetails,
} from "./memory_remove.js";

export { ok, err, type ToolResult } from "./tool-result.js";