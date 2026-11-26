import type { MemoryType, UpdateMemoryRequest } from './api.js';

export interface MemoryUpdateFlags {
  title?: string;
  content?: string;
  type?: MemoryType;
  tags?: string;
  append?: boolean;
  forgetHistory?: boolean;
  interactive?: boolean;
}

/**
 * Turns `memory update` flags into a request body.
 *
 * `--append` adds the content under the existing text and leaves everything
 * else unchanged, so no saved version is needed. `--forget-history` deletes
 * the memory's saved versions and may be used on its own. The server rejects
 * the two together, so the CLI does too, before any request is sent.
 */
export function buildMemoryUpdateRequest(flags: MemoryUpdateFlags): UpdateMemoryRequest {
  if (flags.append && flags.forgetHistory) {
    throw new Error('--append cannot be combined with --forget-history');
  }
  if (flags.append && flags.interactive) {
    throw new Error('--append cannot be combined with --interactive; pass the new text with --content');
  }
  if (flags.append && !flags.content?.trim()) {
    throw new Error('--append needs the text to add, passed with --content');
  }

  const request: UpdateMemoryRequest = {};
  if (flags.title) request.title = flags.title;
  if (flags.content) request.content = flags.content;
  if (flags.type) request.memory_type = flags.type;
  if (flags.tags) {
    request.tags = flags.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  if (flags.append) request.mode = 'append';
  if (flags.forgetHistory) request.forget_history = true;
  return request;
}
