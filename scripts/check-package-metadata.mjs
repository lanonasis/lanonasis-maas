#!/usr/bin/env node
/**
 * check-package-metadata.mjs
 *
 * Every package in this repo must point back at lanonasis/lanonasis-maas, so
 * npm "Repository" links resolve and GitHub Packages links each package to
 * this repo. Checks cli/, packages/* and IDE-EXTENSIONS/* package.json files
 * (repository.url + repository.directory + homepage + bugs) and the Python
 * packages' [project.urls].Repository. Exits 1 listing every mismatch.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://github.com/lanonasis/lanonasis-maas";
const REPO_URL = /^(git\+)?https:\/\/github\.com\/lanonasis\/lanonasis-maas(\.git)?$/;

const dirs = ["cli"];
for (const parent of ["packages", "IDE-EXTENSIONS"]) {
  for (const name of readdirSync(join(root, parent), { withFileTypes: true })) {
    if (name.isDirectory()) dirs.push(`${parent}/${name.name}`);
  }
}

const problems = [];
for (const dir of dirs) {
  const pkgPath = join(root, dir, "package.json");
  const pyPath = join(root, dir, "pyproject.toml");

  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const repo = typeof pkg.repository === "string" ? { url: pkg.repository } : pkg.repository || {};
    if (!REPO_URL.test(repo.url || "")) problems.push(`${dir}: repository.url is ${repo.url ?? "missing"}`);
    if (repo.directory !== dir) problems.push(`${dir}: repository.directory is ${repo.directory ?? "missing"} (want ${dir})`);
    if (!String(pkg.homepage || "").startsWith(BASE)) problems.push(`${dir}: homepage is ${pkg.homepage ?? "missing"}`);
    const bugs = typeof pkg.bugs === "string" ? pkg.bugs : pkg.bugs?.url;
    if (bugs !== `${BASE}/issues`) problems.push(`${dir}: bugs is ${bugs ?? "missing"}`);
  } else if (existsSync(pyPath)) {
    const text = readFileSync(pyPath, "utf8");
    const urls = text.match(/^\[project\.urls\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] || "";
    const repoUrl = urls.match(/^Repository\s*=\s*"([^"]+)"/m)?.[1];
    if (repoUrl !== BASE) problems.push(`${dir}: [project.urls].Repository is ${repoUrl ?? "missing"}`);
  }
}

if (problems.length) {
  console.error(`package metadata: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`package metadata: ${dirs.length} directories checked, all point at ${BASE}`);
