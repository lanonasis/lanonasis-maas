#!/usr/bin/env node
/**
 * release-packages.mjs
 *
 * Drive a release for every package in .github/release-packages.json.
 * Pure Node, no external deps — runs locally and in CI.
 *
 * Modes:
 *   --dry-run                Print the plan, do not change anything.
 *   --only <tag>             Restrict to a single manifest entry (by "tag").
 *   --manifest <path>        Path to the manifest (default ./.github/release-packages.json).
 *   --remote <name>          Git remote to query for existing tags (default origin).
 *   --skip-publish           Skip the `npm publish` step (release + GitHub Packages only).
 *
 * Exit codes:
 *   0  success (or clean dry-run)
 *   1  manifest parse error / missing field / non-zero live step
 *   2  pre-flight check failed (e.g. package.json version unreadable)
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");

const args = parseArgs(process.argv.slice(2));
const dryRun = args["dry-run"] === true;
const only = args["only"] || null;
const manifestPath = resolve(args.manifest || "./.github/release-packages.json");
const remote = args.remote || "origin";
const skipPublish = args["skip-publish"] === true;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function readManifest(path) {
  if (!existsSync(path)) {
    fail(`manifest not found: ${path}`);
  }
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      fail("manifest is not an object");
    }
    if (!Array.isArray(parsed.packages) && !Array.isArray(parsed.python)) {
      fail("manifest has neither 'packages' nor 'python' arrays");
    }
    return parsed;
  } catch (err) {
    fail(`manifest parse error: ${err.message}`);
  }
}

function readPackageJson(dir) {
  const pkgPath = resolve(repoRoot, dir, "package.json");
  if (!existsSync(pkgPath)) {
    return { error: `package.json not found: ${dir}` };
  }
  try {
    const raw = readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.name) return { error: `${dir}/package.json missing "name"` };
    if (!parsed.version) return { error: `${dir}/package.json missing "version"` };
    return { pkg: parsed };
  } catch (err) {
    return { error: `${dir}/package.json parse error: ${err.message}` };
  }
}

function readPyprojectVersion(dir) {
  const pypPath = resolve(repoRoot, dir, "pyproject.toml");
  if (!existsSync(pypPath)) {
    return { error: `pyproject.toml not found: ${dir}` };
  }
  const text = readFileSync(pypPath, "utf8");
  const match = text.match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!match) return { error: `version not found in ${dir}/pyproject.toml` };
  return { version: match[1] };
}

function remoteTagExists(tag) {
  // Cheap existence check via git ls-remote; we filter locally for an exact match.
  const result = spawnSync(
    "git",
    ["ls-remote", "--tags", "--quiet", remote, `refs/tags/${tag}`],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.status !== 0) {
    // Remote may be unreachable (offline dry-run). Treat as "unknown" — emit a soft
    // note and continue rather than failing the dry run.
    return { exists: null, error: result.stderr.trim() };
  }
  const out = (result.stdout || "").trim();
  return { exists: out.length > 0 };
}

function npmVersionExists(name, version) {
  // Returns one of: "yes" (version already on registry), "no" (version is new),
  // "unknown" (npm view failed — registry unreachable, etc.). Offline dry-runs
  // land on "unknown"; we surface that explicitly rather than guessing.
  const result = spawnSync(
    "npm",
    ["view", `${name}@${version}`, "version", "--registry=https://registry.npmjs.org"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    if (stderr.includes("E404") || stderr.includes("Not found") || stderr.includes("npm ERR! code E404")) {
      return "no";
    }
    return "unknown";
  }
  return "yes";
}

function fmtEntry(entry, tag, version, status, npmOverride) {
  const lines = [];
  lines.push(`[${status}] ${entry.name}`);
  lines.push(`  dir:        ${entry.dir}`);
  lines.push(`  version:    ${version}`);
  lines.push(`  tag:        ${tag}`);
  if (entry.npm !== undefined) {
    lines.push(`  npm:        ${npmOverride ?? (entry.npm ? `publish (new version ${version})` : "skip (npm: false; package not on registry yet)")}`);
  }
  if (entry.github !== undefined) lines.push(`  github:     ${entry.github ? "publish to npm.pkg.github.com via GITHUB_TOKEN" : "skip (github: false)"}`);
  lines.push(`  release:    ${status === "DRY RUN" ? "would create GitHub Release with .tgz + .sha256 attached" : "create GitHub Release with .tgz + .sha256 attached"}`);
  return lines.join("\n");
}

function planPackagesSection(manifest, only) {
  const lines = [];
  const entries = (manifest.packages || []).filter((e) => !only || e.tag === only);
  if (entries.length === 0) {
    lines.push("(no matching npm packages)");
    return lines.join("\n");
  }
  for (const entry of entries) {
    const { pkg, error } = readPackageJson(entry.dir);
    if (error) {
      lines.push(`[ERROR] ${entry.name}: ${error}`);
      continue;
    }
    if (pkg.name !== entry.name) {
      lines.push(`[ERROR] ${entry.name}: manifest name does not match ${entry.dir}/package.json (${pkg.name})`);
      continue;
    }
    const tag = `${entry.tag}-v${pkg.version}`;
    const exists = remoteTagExists(tag);
    if (exists.exists === true) {
      lines.push(`[SKIP] ${entry.name} ${pkg.version} — tag ${tag} already exists on ${remote}`);
      continue;
    }
    const npmState = entry.npm ? npmVersionExists(entry.name, pkg.version) : null;
    let npmLine;
    if (entry.npm) {
      if (npmState === "yes") {
        npmLine = `skip (version ${pkg.version} already on registry — would re-publish)`;
      } else if (npmState === "no") {
        npmLine = `publish (new version ${pkg.version})`;
      } else {
        npmLine = `publish (unverified — npm view returned unknown)`;
      }
    } else {
      npmLine = "skip (npm: false; package not on registry yet)";
    }
    lines.push(fmtEntry(entry, tag, pkg.version, "DRY RUN", npmLine));
    if (exists.error) {
      lines.push(`  note:       could not verify tag uniqueness (${exists.error})`);
    }
  }
  return lines.join("\n");
}

function planPythonSection(manifest, only) {
  const lines = [];
  const entries = (manifest.python || []).filter((e) => !only || e.tag === only);
  if (entries.length === 0) {
    lines.push("(no matching python packages)");
    return lines.join("\n");
  }
  for (const entry of entries) {
    const { version, error } = readPyprojectVersion(entry.dir);
    if (error) {
      lines.push(`[ERROR] ${entry.name}: ${error}`);
      continue;
    }
    const tag = `${entry.tag}-v${version}`;
    const exists = remoteTagExists(tag);
    if (exists.exists === true) {
      lines.push(`[SKIP] ${entry.name} ${version} — tag ${tag} already exists on ${remote}`);
      continue;
    }
    const status = "DRY RUN";
    lines.push(`[${status}] ${entry.name} (python)`);
    lines.push(`  dir:        ${entry.dir}`);
    lines.push(`  version:    ${version}`);
    lines.push(`  tag:        ${tag}`);
    lines.push(`  build:      python -m build  (sdist + wheel)`);
    lines.push(`  release:    would create GitHub Release with .tar.gz + .whl attached`);
    if (exists.error) {
      lines.push(`  note:       could not verify tag uniqueness (${exists.error})`);
    }
  }
  return lines.join("\n");
}

function livePackagesSection(manifest, only) {
  // Live execution path — kept thin on purpose. CI workflows do most of the
  // heavy lifting (install, build, test); this script only handles the
  // registry/GitHub steps that need deterministic sequencing.
  const lines = [];
  const entries = (manifest.packages || []).filter((e) => !only || e.tag === only);
  for (const entry of entries) {
    const { pkg, error } = readPackageJson(entry.dir);
    if (error) {
      lines.push(`[ERROR] ${entry.name}: ${error}`);
      continue;
    }
    const tag = `${entry.tag}-v${pkg.version}`;
    const exists = remoteTagExists(tag);
    if (exists.exists === true) {
      lines.push(`[SKIP] ${entry.name} ${pkg.version} — tag ${tag} already exists on ${remote}`);
      continue;
    }
    lines.push(`[LIVE] ${entry.name} ${pkg.version} (tag=${tag})`);
    if (entry.npm && !skipPublish) {
      lines.push(`  → npm publish --provenance --access public  (requires trusted publisher on npmjs.com — owner action)`);
    }
    if (entry.github) {
      lines.push(`  → publish to https://npm.pkg.github.com via --userconfig + GITHUB_TOKEN`);
    }
    lines.push(`  → gh release create ${tag} <tgz> <sha256> --notes "..."`);
  }
  return lines.join("\n");
}

function fail(msg) {
  process.stderr.write(`release-packages.mjs: ${msg}\n`);
  process.exit(2);
}

function header(text) {
  return `\n=== ${text} ===`;
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------
const manifest = readManifest(manifestPath);

process.stdout.write(header("release-packages.mjs — manifest plan"));
process.stdout.write(`manifest:   ${manifestPath}\n`);
process.stdout.write(`dry-run:    ${dryRun}\n`);
process.stdout.write(`only:       ${only || "(all)"}\n`);
process.stdout.write(`remote:     ${remote}\n`);

process.stdout.write(header("npm packages"));
process.stdout.write(dryRun ? planPackagesSection(manifest, only) + "\n" : livePackagesSection(manifest, only) + "\n");

process.stdout.write(header("python packages"));
process.stdout.write(planPythonSection(manifest, only) + "\n");

process.stdout.write(header("done"));
process.stdout.write(dryRun ? "DRY RUN complete — no files changed.\n" : "LIVE plan printed. Each step above requires CI-side execution; this script does not mutate remote state on its own.\n");

process.exit(0);