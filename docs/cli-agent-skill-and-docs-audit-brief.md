# CLI Agent Skill And Docs Audit Brief

**Date:** 2026-07-16  
**Scope:** `@lanonasis/cli`, `@lanonasis/repl-cli`, published npm package contents, live docs at `docs.lanonasis.com/cli`, and command/help drift.

## Current Findings

### Packaged Skill

- `cli/SKILL.md` has been added for Codex/agent runtimes.
- `cli/package.json` now includes `SKILL.md` in the npm `files` list.
- Confirm with:

```bash
cd cli
npm pack --dry-run --json | jq '.[0].files[].path' | grep SKILL.md
```

### Main CLI And REPL Bridge

- `lanonasis repl` is a bridge into `@lanonasis/repl-cli`, not a separate REPL implementation.
- Local rebuilt help shows the bridge now forwards:
  - `--mcp`
  - `--api <url>`
  - `--ai-router <url>`
  - `--token <token>`
  - `--model <model>`
  - `--config <path>`
- `lrepl config` shows the REPL has a distinct concierge endpoint stack:
  - `apiUrl`: `https://api.lanonasis.com`
  - `aiRouterUrl`: `https://ai.vortexcore.app`
  - `openaiModel`: `L-Zero`
  - `useMCP`: `false`

### Live Docs Drift

Checked live docs on 2026-07-16:

- `https://docs.lanonasis.com/cli` did not resolve directly in the browser tool.
- `https://docs.lanonasis.com/cli/reference` exists, but says `@lanonasis/cli v3.9.8+`.
- The live CLI reference does not document:
  - `lanonasis repl`
  - `lrepl` / `@lanonasis/repl-cli`
  - `lanonasis prescan`
  - `lanonasis documentation`
  - `lanonasis dashboard`
  - `lanonasis sdk`
  - `lanonasis api`
  - `lanonasis deploy`
  - `lanonasis service`
- The live CLI reference uses `onasis mcp list-tools`, while current CLI help exposes `lanonasis mcp tools`.
- The live CLI reference lists `topics` examples, while current main help exposes `topic`.
- The live changelog page still centers on 2026-Q1 / CLI v3.9.8 and does not mention `@lanonasis/cli` 3.10.1, 3.11.0, 3.11.1, or `@lanonasis/repl-cli` 1.0.1.
- Local context docs are also stale:
  - `docs/context/project-overview.md` still says `@lanonasis/cli` v3.11.0 and `@lanonasis/repl-cli` v1.0.0.
  - `docs/context/components/cli.md` was last verified 2026-05-16 and does not reflect `prescan` or the REPL bridge.

## Audit Goals For Hermes

Run a functionality and docs audit that produces a targeted scope, not a broad rewrite.

### Inputs To Compare

Commands:

```bash
node cli/dist/index.js -h
node cli/dist/index.js repl -h
node cli/dist/index.js prescan -h
node cli/dist/index.js mcp -h
node cli/dist/index.js api-keys -h
node packages/repl-cli/dist/index.js -h
node packages/repl-cli/dist/index.js start -h
node packages/repl-cli/dist/index.js config
```

Package metadata:

```bash
node -e "console.log(require('./cli/package.json'))"
node -e "console.log(require('./packages/repl-cli/package.json'))"
npm pack --dry-run --json --prefix cli
npm pack --dry-run --json --prefix packages/repl-cli
```

Source files:

```text
cli/src/index.ts
cli/src/commands/
cli/src/mcp/
cli/src/utils/config.ts
cli/README.md
cli/CHANGELOG.md
cli/SKILL.md
packages/repl-cli/src/
packages/repl-cli/README.md
packages/repl-cli/CLI_COMMANDS.md
packages/repl-cli/CHANGELOG.md
docs/context/project-overview.md
docs/context/components/cli.md
docs/cli-drift-analysis-and-fixes.md
```

Live docs:

```text
https://docs.lanonasis.com/cli
https://docs.lanonasis.com/cli/reference
https://docs.lanonasis.com/changelog
https://docs.lanonasis.com/mcp/overview
```

### Required Audit Output

Produce a report with:

1. Command inventory table: current command, source file, help output, documented location, status.
2. Package inventory table: npm package, version, binaries, bundled/optional deps, publish artifacts.
3. Docs drift list grouped by severity:
   - Critical: docs instruct a command that fails or points users to a wrong endpoint.
   - Warning: missing commands, stale versions, stale examples, naming drift.
   - Info: consolidation or wording cleanup.
4. Dependency scan:
   - Compare `cli/package.json` and `packages/repl-cli/package.json` against lockfiles and `npm pack --dry-run`.
   - Flag missing runtime deps, accidental dev-only deps in runtime paths, and optional dependency risks.
   - Check `@lanonasis/repl-cli` publication order risk before `@lanonasis/cli`.
5. AI Router reliability gap:
   - Identify the current REPL AI Router request/response schema.
   - Validate fallback behavior: AI Router -> OpenAI -> local pattern matching.
   - Flag tests that are only unit/smoke and not end-to-end.
6. Recommended patch plan:
   - Minimal files to update.
   - Verification commands.
   - Publish order.
   - Any blocked items requiring credentials or live service access.

### Guardrails

- Do not print secrets, tokens, vendor keys, or raw prescan findings.
- Prefer read-only commands unless explicitly implementing a fix.
- Do not treat global installed binaries as source of truth if local `dist/` differs.
- Do not claim full concierge stability from unit tests alone.
- Keep docs updates targeted; avoid rewriting historical docs unless they are user-facing or linked from live docs.

## Suggested Hermes Command

```bash
hermes kanban create \
  "Audit LanOnasis CLI package, REPL bridge, docs drift, and dependency publish readiness" \
  --workspace dir:/Users/vortexcore/Projects-Lanonasis/maas/lanonasis-maas \
  --priority 90 \
  --max-runtime 2h \
  --goal \
  --goal-max-turns 12 \
  --idempotency-key lanonasis-cli-docs-deps-audit-2026-07-16 \
  --body "$(cat docs/cli-agent-skill-and-docs-audit-brief.md)"
```
