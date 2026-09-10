/**
 * MarkdownMemoryMirror — append-only human-readable shadow of local
 * SQLite memory entries at `<rootDir>/memory/YYYY-MM-DD.md`.
 *
 * Pattern source: openclaw-plugin/hooks/local-fallback.ts (LocalFallbackWriter).
 * The openclaw writer appends raw user input; this adapter writes
 * already-redacted + structured records, so the markdown file is a
 * clean human audit trail rather than a transcript.
 *
 * Contract:
 *   - File per UTC day, append-only
 *   - One block per write, formatted as:
 *       ## <title>
 *       <content>
 *       <!-- id: <uuid> | type: <memory_type> | tags: <json> | at: <iso> -->
 *   - Never throws; failures are swallowed and logged via stderr.
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { MemoryType } from './types.js';

export interface MarkdownMirrorEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  memory_type: MemoryType;
  created_at: string; // ISO
}

export interface MarkdownMirrorOptions {
  rootDir: string;
  /** Subdirectory for daily files. Default: 'memory'. */
  subdir?: string;
}

export class MarkdownMemoryMirror {
  private readonly rootDir: string;
  private readonly subdir: string;

  constructor(options: MarkdownMirrorOptions) {
    if (!options.rootDir) throw new Error('MarkdownMemoryMirror: rootDir required');
    this.rootDir = options.rootDir;
    this.subdir = options.subdir ?? 'memory';
  }

  async write(entry: MarkdownMirrorEntry): Promise<void> {
    const today = entry.created_at.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const filePath = join(this.rootDir, this.subdir, `${today}.md`);
    try {
      await mkdir(dirname(filePath), { recursive: true });
    } catch {
      // directory may already exist
    }

    const tagsJson = JSON.stringify(entry.tags);
    const body = [
      `## ${entry.title}`,
      '',
      entry.content,
      '',
      `<!-- id: ${entry.id} | type: ${entry.memory_type} | tags: ${tagsJson} | at: ${entry.created_at} -->`,
      '',
      '---',
      '',
    ].join('\n');

    try {
      await appendFile(filePath, body, 'utf8');
    } catch (err) {
      // Mirror writes are best-effort. SQLite is the source of truth.
      // eslint-disable-next-line no-console
      console.warn(`[local-memory] markdown mirror write failed: ${(err as Error).message}`);
    }
  }
}
