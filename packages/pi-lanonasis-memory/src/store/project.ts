/**
 * project.ts — project scope resolution and SOUL.md bootstrap.
 *
 * `resolveProject(cwd)` is the single source of truth for "what
 * project is this session in?". It uses `git rev-parse --show-toplevel`
 * via execFileSync (no shell, so untrusted paths are safe), and falls
 * back to the cwd basename outside a git repo.
 *
 * `bootstrapSoul` ingests CWD/SOUL.md paragraphs as `project` memories
 * tagged `soul-bootstrap` + `project:<slug>`, so the identity boot
 * seed lands through the same scanner-gated pipeline as every other
 * write (no second code path that could bypass secret-blocking).
 *
 * All filesystem paths are injected for tests.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

import { MemoryStore } from "./memory.js";

export const SOUL_BOOTSTRAP_TAG = "soul-bootstrap";
const SOUL_FILENAME = "SOUL.md";

/** Lowercase `[a-z0-9-]+`, max 64 chars. Empty string when nothing survives. */
export function slugify(input: string): string {
  const lower = input.toLowerCase();
  // Replace any run of non-[a-z0-9] with a single dash, then trim dashes.
  const dashed = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return dashed.slice(0, 64);
}

export function projectTag(slug: string): string {
  return `project:${slug}`;
}

export interface ResolvedProject {
  name: string;
  slug: string;
}

/**
 * Resolve the project for `cwd`. Returns null when no usable slug
 * can be derived (e.g. cwd === "/" with no name).
 *
 * - In a git repo: name = toplevel basename, slug = slugify(name).
 * - Outside a git repo (or if git fails): name = cwd basename, slug = slugify(name).
 */
export function resolveProject(cwd: string): ResolvedProject | null {
  if (typeof cwd !== "string" || cwd.length === 0) return null;

  let name: string;
  try {
    const toplevel = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (toplevel.length === 0) throw new Error("empty toplevel");
    name = basename(toplevel);
  } catch {
    // Expected outside a git checkout (or without git on PATH): fall
    // back to the directory name.
    name = basename(cwd);
  }

  const slug = slugify(name);
  if (slug.length === 0) return null;
  return { name, slug };
}

export interface BootstrapResult {
  /** Number of paragraphs successfully ingested. */
  ingested: number;
  /** Non-fatal per-paragraph failures (scanner block, validation, ...). */
  errors: string[];
  /**
   * When the bootstrap short-circuited, this is why.
   *   "no-soul-file"        — CWD/SOUL.md does not exist
   *   "already-bootstrapped"— a memory tagged soul-bootstrap for this project exists
   *   "no-project"          — cwd resolved to no slug
   *   undefined              — bootstrap ran (ingested may be 0 if all paragraphs were rejected)
   */
  skipped?: "no-soul-file" | "already-bootstrapped" | "no-project";
}

/**
 * Ingest CWD/SOUL.md paragraphs as `project` memories tagged with
 * `soul-bootstrap` + `project:<slug>` if no such memory already exists
 * for the project. Idempotent and scanner-gated.
 */
export function bootstrapSoul(
  projectRoot: string,
  cwd: string,
  store: MemoryStore,
): BootstrapResult {
  const project = resolveProject(cwd);
  if (!project) {
    return { ingested: 0, errors: [], skipped: "no-project" };
  }

  const soulPath = `${cwd.replace(/\/+$/, "")}/${SOUL_FILENAME}`;
  if (!existsSync(soulPath)) {
    return { ingested: 0, errors: [], skipped: "no-soul-file" };
  }

  const tag = projectTag(project.slug);
  const existing = store.list({ tags: [SOUL_BOOTSTRAP_TAG, tag] });
  if (existing.length > 0) {
    return { ingested: 0, errors: [], skipped: "already-bootstrapped" };
  }

  const raw = readFileSync(soulPath, "utf8");
  const paragraphs = splitSoulParagraphs(raw);
  const errors: string[] = [];
  let ingested = 0;
  for (const para of paragraphs) {
    const title = paragraphTitle(para);
    const r = store.add({
      target: "project",
      title,
      content: para.body,
      tags: [SOUL_BOOTSTRAP_TAG, tag],
      category: "preference",
    });
    if (r.ok) {
      ingested += 1;
    } else {
      errors.push(r.reason);
    }
  }
  // `projectRoot` is reserved for future use (e.g. project-local SKILL.md
  // surface); the bootstrap doesn't write anywhere outside SQLite.
  void projectRoot;
  return { ingested, errors };
}

interface Paragraph {
  /** Heading line that began the section, or null for the preamble. */
  heading: string | null;
  body: string;
}

function splitSoulParagraphs(text: string): Paragraph[] {
  // Heading-aware split: each `## …` (or deeper) starts a new section.
  // Within a section, blank lines separate paragraphs. The preamble
  // (text before the first heading) is also split on blank lines.
  const lines = text.split(/\r?\n/);
  const sections: Paragraph[] = [];
  let current: Paragraph = { heading: null, body: "" };
  let buffer: string[] = [];

  const flushBuffer = (): void => {
    const chunk = buffer.join("\n").replace(/^\s+|\s+$/g, "");
    if (chunk.length > 0) sections.push({ heading: current.heading, body: chunk });
    buffer = [];
  };

  const flushSection = (): void => {
    flushBuffer();
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flushSection();
      current = { heading: heading[2] ?? null, body: "" };
      continue;
    }
    if (line.trim() === "") {
      flushBuffer();
      continue;
    }
    buffer.push(line);
  }
  flushSection();

  return sections;
}

function paragraphTitle(p: Paragraph): string {
  if (p.heading) return p.heading;
  // First non-empty line of the body, truncated.
  const first = p.body.split("\n", 1)[0] ?? "";
  const trimmed = first.trim();
  if (trimmed.length === 0) return "Soul";
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}…`;
}
