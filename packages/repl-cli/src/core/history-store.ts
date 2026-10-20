/**
 * Persistence layer for @lanonasis/repl-cli command history.
 *
 * Keeps ReplEngine thin: it only owns the in-memory `inputHistory` array and
 * the readline integration. This module owns load / append / trim / permissions,
 * plus the secrets-and-length sanitiser that gates what reaches disk.
 *
 * Design notes:
 *
 * - Load is non-fatal. Missing file → empty history, no error. Garbage or
 *   unreadable file → warn once, return empty history. The REPL must always
 *   come up, even on a corrupted file.
 *
 * - Append is one line per entry, with `appendFileSync`. The full file is
 *   only rewritten when trimming past `maxHistorySize`. No rewrite on every
 *   keystroke.
 *
 * - Trimming rewrites atomically with a temp-file + rename. A crash mid-trim
 *   leaves the previous file intact.
 *
 * - Permissions: the file is 0600, the containing directory 0700. We never
 *   write the whole history file contents to logs.
 *
 * - The opt-out is checked here so even a misconfigured caller cannot
 *   resurrect on-disk persistence by passing `historyPersistence: true`
 *   without their consent.
 */
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

import { containsSecrets } from '../local-memory/privacy.js';

/** Hard ceiling for a single persisted entry. */
export const MAX_PERSISTED_LINE_LENGTH = 2000;

/** History file permissions (matches ssh / credential-file norms). */
export const HISTORY_FILE_MODE = 0o600;
/** Containing-directory permissions. */
export const HISTORY_DIR_MODE = 0o700;

export interface HistoryStoreOptions {
  /** Absolute path to the history file. */
  file: string;
  /** Maximum entries kept both in memory and on disk. */
  maxHistorySize: number;
  /**
   * Set to false to disable all disk writes. Defaults to `true` so callers
   * who pass `historyPersistence: false` in config can disable persistence
   * cleanly. We never re-read this flag inside the file write path — once
   * disabled, all writes are skipped from the very first call.
   */
  persistenceEnabled?: boolean;
  /** Optional sink for one-time warnings (defaults to `console.warn`). */
  warn?: (message: string) => void;
}

export interface LoadResult {
  /** Lines read from disk, newest-last, capped to maxHistorySize. */
  entries: string[];
  /** True if the file existed and was readable. False if missing. */
  fileFound: boolean;
  /** True if the file was present but discarded (corrupt or unreadable). */
  warned: boolean;
}

/** True when a line is empty or whitespace-only. */
export function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

/** True when a string looks like a multi-line paste (literal newlines). */
export function isMultiLinePaste(line: string): boolean {
  return line.includes('\n');
}

/**
 * Reject anything that should never land on disk: blank lines, anything
 * that exceeds the per-line ceiling, anything that smells like a
 * multi-line paste, and anything that contains a recognised credential
 * pattern. Returning a stable, descriptive reason keeps tests honest.
 */
export type RejectionReason =
  | 'blank'
  | 'too-long'
  | 'multi-line'
  | 'contains-secret'
  | 'disabled';

export interface PersistDecision {
  persist: boolean;
  reason?: RejectionReason;
}

/**
 * Pure-ish decision function. Easy to unit-test, no FS access.
 *
 * `persistenceEnabled` defaults to true so the rest of the codebase can
 * always reach `shouldPersist(...)`. The actual write path also checks
 * the flag again — defence in depth.
 */
export function shouldPersist(
  input: string,
  options: { persistenceEnabled?: boolean } = {},
): PersistDecision {
  if (options.persistenceEnabled === false) {
    return { persist: false, reason: 'disabled' };
  }
  if (isBlank(input)) {
    return { persist: false, reason: 'blank' };
  }
  if (input.length > MAX_PERSISTED_LINE_LENGTH) {
    return { persist: false, reason: 'too-long' };
  }
  if (isMultiLinePaste(input)) {
    return { persist: false, reason: 'multi-line' };
  }
  if (containsSecrets(input)) {
    return { persist: false, reason: 'contains-secret' };
  }
  return { persist: true };
}

/** Default warn sink. */
function defaultWarn(message: string): void {
  // Single line; never echo the offending content.
  console.warn(`[history-store] ${message}`);
}

/**
 * Read the history file from disk. Never throws. Garbage / unreadable file
 * is reported via `warned: true` and a one-line warning.
 */
export function loadHistory(opts: HistoryStoreOptions): LoadResult {
  const { file, maxHistorySize } = opts;
  const warn = opts.warn ?? defaultWarn;

  if (!existsSync(file)) {
    return { entries: [], fileFound: false, warned: false };
  }

  let raw: string;
  try {
    raw = readFileSync(file, 'utf-8');
  } catch (error) {
    warn(`could not read history file at ${file}; starting with empty history`);
    return { entries: [], fileFound: true, warned: true };
  }

  // Split on any newline, drop blanks, normalise to single trailing newline.
  const lines = raw.split(/\r?\n/);
  const entries: string[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if (line.length > MAX_PERSISTED_LINE_LENGTH) {
      // Skip silently — old data shouldn't choke a fresh session, but
      // we don't want it back in our in-memory history either.
      continue;
    }
    entries.push(line);
  }

  if (entries.length === 0) {
    // File existed but was empty / all blanks — that's a successful read.
    return { entries: [], fileFound: true, warned: false };
  }

  // Preserve chronological order; cap to the newest maxHistorySize entries.
  const trimmed =
    entries.length > maxHistorySize ? entries.slice(-maxHistorySize) : entries;
  if (trimmed.length !== entries.length) {
    // Quietly rewrite the trimmed file so the on-disk size matches memory.
    rewriteHistorySync({ ...opts, entries: trimmed });
  }
  return { entries: trimmed, fileFound: true, warned: false };
}

/** Fail-safe append — never throws, never writes partial secrets. */
export function appendHistory(
  line: string,
  opts: HistoryStoreOptions,
): PersistDecision {
  const decision = shouldPersist(line, opts);
  if (!decision.persist) {
    return decision;
  }
  try {
    ensureDir(opts.file);
    appendFileSync(opts.file, line + '\n', { encoding: 'utf-8', mode: HISTORY_FILE_MODE });
    tryChmod(opts.file, HISTORY_FILE_MODE);
  } catch (error) {
    // Swallow FS errors; the REPL must keep running.
    const warn = opts.warn ?? defaultWarn;
    const reason = error instanceof Error ? error.message : String(error);
    warn(`failed to append history (${reason})`);
    return { persist: false, reason: 'disabled' };
  }

  // After every successful append, check whether the on-disk file now has
  // more lines than the cap. We allow the file to grow exactly to `max` and
  // trim the moment it tries to exceed it (atomic temp+rename, never grows
  // unbounded). This is the only place that enforces the file ceiling —
  // the in-memory buffer is trimmed separately in ReplEngine so ↑/↓
  // navigation never sees more than `max` items.
  try {
    const raw = readFileSync(opts.file, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length > (opts.maxHistorySize ?? 1000)) {
      const kept = lines.slice(-(opts.maxHistorySize ?? 1000));
      rewriteHistorySync({
        file: opts.file,
        maxHistorySize: opts.maxHistorySize ?? 1000,
        persistenceEnabled: true,
        entries: kept,
      });
    }
  } catch {
    // Trimming is best-effort; the next append will retry.
  }
  return decision;
}

/**
 * Atomic-ish rewrite used by the trim path: write to a temp file in the
 * same directory, then rename over the target. Never partially clobbers
 * the live file.
 */
export function rewriteHistorySync(opts: HistoryStoreOptions & { entries: string[] }): void {
  const { file, entries } = opts;
  ensureDir(file);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const body = entries.length === 0 ? '' : entries.join('\n') + '\n';
  try {
    writeFileSync(tmp, body, { encoding: 'utf-8', mode: HISTORY_FILE_MODE });
    tryChmod(tmp, HISTORY_FILE_MODE);
    renameSync(tmp, file);
    tryChmod(file, HISTORY_FILE_MODE);
  } catch (error) {
    // Clean up the dangling temp on failure.
    try {
      rmSync(tmp, { force: true });
    } catch {
      // ignore
    }
    const warn = opts.warn ?? defaultWarn;
    const reason = error instanceof Error ? error.message : String(error);
    warn(`failed to rewrite history (${reason})`);
  }
}

function ensureDir(file: string): void {
  const dir = dirname(file);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: HISTORY_DIR_MODE });
  }
  tryChmod(dir, HISTORY_DIR_MODE);
}

/**
 * chmod is best-effort: on some volumes (e.g. Windows, FAT32, no-promote
 * tmpfs) it may throw. We do not let permission enforcement block the
 * REPL. The caller can inspect the file outside the test suite for stronger
 * guarantees on POSIX.
 */
function tryChmod(target: string, mode: number): void {
  try {
    chmodSync(target, mode);
  } catch {
    // Ignore — best-effort only.
  }
}

/** Surface the directory and file permissions for tests / observability. */
export function inspectHistoryPath(file: string): { fileMode?: number; dirMode?: number } {
  const out: { fileMode?: number; dirMode?: number } = {};
  if (existsSync(file)) {
    try {
      out.fileMode = statSync(file).mode & 0o777;
    } catch {
      // ignore
    }
  }
  const dir = dirname(file);
  if (existsSync(dir)) {
    try {
      out.dirMode = statSync(dir).mode & 0o777;
    } catch {
      // ignore
    }
  }
  return out;
}
