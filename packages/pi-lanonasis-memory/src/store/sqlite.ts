/**
 * sqlite.ts — minimal SQLite opener.
 *
 * Follows the openclaw-plugin/extraction/sqlite-extractor.ts priority:
 *   1. bun:sqlite   — when running under Bun
 *   2. node:sqlite  — when running under Node.js >= 22.5 (experimental)
 *   3. Throw with a clear message if neither is available
 *
 * No native module dependency. This is the same shape recall-forge uses
 * (per review C.4 evidence anchor). Both runtimes expose a synchronous
 * SQLite API; the DatabaseLike interface below is the minimal surface
 * MemoryStore needs.
 *
 * Implementation note: we use `createRequire(import.meta.url).require()`
 * for the dynamic lookup rather than a top-level `await import()`. This
 * sidesteps a known issue where vitest/vite's import-analysis pass
 * strips the `node:` prefix from built-in specifiers, breaking the
 * load. `createRequire` uses Node's native CommonJS loader and
 * resolves `node:` specifiers correctly under both Node and Bun.
 */

import { createRequire } from "node:module";

export type SqliteStatement = {
  run(...params: unknown[]): SqliteRunResult;
  get<T = unknown>(...params: unknown[]): T | undefined;
  all<T = unknown>(...params: unknown[]): T[];
};

export type SqliteRunResult = {
  changes: number;
  lastInsertRowid: number | bigint;
};

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  /**
   * Execute raw SQL. NOTE: this is SQLite's `exec`, not
   * `child_process.exec`. It takes a SQL string (DDL / multi-statement
   * script) and runs it directly against the database — there is no
   * shell, no command parsing, and no interpolation of user input.
   */
  exec(sql: string): void;
  close(): void;
}

/**
 * Try to open `dbPath` using the best available SQLite binding.
 *
 * Throws a clear Error if neither binding is available — callers should
 * surface that to the user with remediation steps (install Bun, or
 * upgrade Node to >= 22.5 and run with --experimental-sqlite).
 */
export async function openSqlite(dbPath: string): Promise<SqliteDatabase> {
  const require = createRequire(import.meta.url);

  // 1. Bun's built-in SQLite (preferred when running under Bun).
  try {
    const bunSqlite = require("bun:sqlite") as {
      Database: new (path: string, opts?: unknown) => unknown;
    };
    const db = new bunSqlite.Database(dbPath, { create: true });
    return wrapBun(db);
  } catch {
    // bun:sqlite unavailable — fall through to node:sqlite.
  }

  // 2. Node.js built-in (experimental in 22.5+).
  try {
    const nodeSqlite = require("node:sqlite") as {
      DatabaseSync: new (path: string, opts?: unknown) => unknown;
    };
    const db = new nodeSqlite.DatabaseSync(dbPath, { open: true });
    return wrapNode(db);
  } catch {
    // node:sqlite unavailable — fall through to error.
  }

  throw new Error(
    "SQLite is unavailable. Either run this extension under Bun " +
      "(which ships bun:sqlite), or upgrade to Node.js >= 22.5 and " +
      "launch with --experimental-sqlite. See review doc Appendix C " +
      "evidence anchors for the runtime-priority rationale."
  );
}

function wrapBun(raw: unknown): SqliteDatabase {
  type BunDb = {
    prepare(sql: string): unknown;
    exec(sql: string): void;
    close(): void;
  };
  type BunStmt = {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  const db = raw as BunDb;
  return {
    prepare(sql) {
      const stmt = db.prepare(sql) as BunStmt;
      return {
        run(...params) {
          const r = stmt.run(...params);
          return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
        },
        get<T>(...params: unknown[]): T | undefined {
          return stmt.get(...params) as T | undefined;
        },
        all<T>(...params: unknown[]): T[] {
          return stmt.all(...params) as T[];
        },
      };
    },
    exec(sql) {
      db.exec(sql);
    },
    close() {
      db.close();
    },
  };
}

function wrapNode(raw: unknown): SqliteDatabase {
  type NodeDb = {
    prepare(sql: string): unknown;
    exec(sql: string): void;
    close(): void;
  };
  type NodeStmt = {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  const db = raw as NodeDb;
  return {
    prepare(sql) {
      const stmt = db.prepare(sql) as NodeStmt;
      return {
        run(...params) {
          const r = stmt.run(...params);
          return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
        },
        get<T>(...params: unknown[]): T | undefined {
          return stmt.get(...params) as T | undefined;
        },
        all<T>(...params: unknown[]): T[] {
          return stmt.all(...params) as T[];
        },
      };
    },
    exec(sql) {
      db.exec(sql);
    },
    close() {
      db.close();
    },
  };
}
