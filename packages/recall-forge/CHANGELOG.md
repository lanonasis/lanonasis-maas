# Changelog

All notable changes to `@lanonasis/recall-forge` will be documented in this file.

---

## 1.1.0 — 2026-03-26

Privacy Guard — PII protection layer + wired secret redactor.

### What's New in 1.1.0

**`privacy/privacy-guard.ts` — two-stage protection pipeline**

The core gap in 1.0.0: `redactSecrets()` was only wired into the `extract` CLI path. Every live write path — the `memory_store` agent tool, auto-capture hooks, and the local fallback writer — wrote raw content to storage and disk with no redaction. A live audit confirmed a bridge token had leaked into `workspace/memory/2026-03-16-heartbeat-check.md` via the capture hook.

The `PrivacyGuard` class fixes all write paths simultaneously:

- **Stage 1** — `redactSecrets()` (30 credential patterns) — always-on, cannot be disabled
- **Stage 2** — `@lanonasis/privacy-sdk` PII detection/masking (13+ types: SSN, email, credit card, IBAN, passport, DOB, IP, phone, UK NINO/postcode) with Luhn validation and GDPR/CCPA/HIPAA/PCI-DSS compliance tagging
- **Output** — `PrivacyReport` capturing `secretsFound`, `piiTypes`, `piiSensitivity`, `regulations`, and `action` (`passthrough | redacted | masked | detected | redacted+masked`)

**`privacy/privacy-log.ts` — daily audit log**

When `localFallback: true`, interventions are written to `workspace/memory/privacy/YYYY-MM-DD.md` — a markdown table with time, action, PII types, sensitivity level, and applicable regulations. Built-in audit trail, no external tooling required.

**Privacy metadata and tags on every stored memory**

When an intervention occurs, the stored memory receives:
- Auto-injected tags: `pii:email`, `privacy:redacted`, `compliant:gdpr`, etc. — visible in `openclaw recall list`
- Metadata block: `privacy.action`, `privacy.secretsFound`, `privacy.piiTypes`, `privacy.regulations` — visible in `openclaw recall get <id>`

**Optional webhook for out-of-band notification**

When `privacyNotifyUrl` is set, RecallForge POSTs a compact event payload (`event`, `action`, `piiTypes`, `regulations`, `timestamp` — never content) to the configured URL. Fire-and-forget; any failure is silently dropped and never blocks the memory write.

**`LocalFallbackWriter` now has belt-and-suspenders defense**

Even if code paths bypass the guard, the fallback writer runs `redactSecrets()` before writing to disk. The specific leak vector (session conversation with embedded config containing bridge token → raw fallback write) is now blocked at both layers.

**Three new config fields**

| Field | Default | Description |
|-------|---------|-------------|
| `privacyMode` | `mask` | `mask`: detect + mask PII. `detect`: scan + tag, no masking. `off`: skip PII layer (credentials still stripped). |
| `privacyLocale` | `US` | PII detection locale hint: `US`, `UK`, `EU`, `DE`, `FR`, `JP`, `AU`, `CA` |
| `privacyNotifyUrl` | — | Webhook URL for privacy intervention events |

**Startup log updated**

```
[recall-forge] Ready — slots: memory+contextEngine | ... | privacy: mask | project: <id>
```

**`@lanonasis/privacy-sdk` added as runtime dependency**

PII detection with zero transitive runtime dependencies.

---

## 1.0.0 — 2026-03-25

Inaugural release of RecallForge. New package, new identity, new slot.

### What's New in 1.0.0

**Dual-slot registration — fills `memory` AND `contextEngine`**

RecallForge is the first LanOnasis plugin to occupy both OpenClaw plugin slots simultaneously. The previous package (`@lanonasis/memory-lanonasis`) only registered in the `memory` slot. The `contextEngine` slot gives RecallForge a direct seat in prompt construction — OpenClaw calls `buildContext()` on demand rather than only at session start events.

**`hooks/context-engine.ts` — new contextEngine implementation**

- Registered via `api.registerContextEngine()` with `priority: 10`
- Reuses the full tiered recall chain: personal → shared namespace → dedup
- Same 5s timeout, prompt injection filter, and `maxRecallChars` budget as the recall hook
- Returns empty string silently on any failure — never blocks the agent session

**`plugin-sdk-stub.ts` updated with contextEngine types**

Added `ContextEngineProvider`, `OpenClawSession`, and `registerContextEngine` to the stub so the type surface matches the real OpenClaw SDK.

**Secret redactor rebuilt from source — 30 patterns (was 4)**

The compiled `dist/extraction/secret-redactor.js` now matches the TypeScript source. The previously published `@lanonasis/memory-lanonasis` had a stale build with only 4 basic patterns. RecallForge ships the full pattern set covering Anthropic, OpenAI, GitHub, Supabase, Stripe, AWS, Google, Notion, LanOnasis, Telegram, JWTs, PEM private keys, database connection strings, Bearer tokens, env var assignments, and 64+ character hex secrets.

**Security manifest on `client.js`**

Module-level JSDoc documents the exact credential resolution chain (7 sources, all `LANONASIS_*` namespaced or local encrypted files) and the network scope (exclusively `api.lanonasis.com`). Addresses static scanner false positive without changing any logic.

**Plugin ID and manifest updated**

- Plugin ID: `memory-lanonasis` → `recall-forge`
- `openclaw.plugin.json` now declares `"slots": ["memory", "contextEngine"]`
- Package name: `@lanonasis/memory-lanonasis` → `@lanonasis/recall-forge`

---

## Lineage — Prior Releases as `@lanonasis/memory-lanonasis`

RecallForge is built on the `memory-lanonasis` codebase. The release history below is preserved for continuity.

### 0.3.3 — 2026-03-25 (final `memory-lanonasis` release)

- Reframed description as secret-safe memory plugin
- Added `secret-protection`, `credential-redaction`, `privacy-first` keywords
- Version bumped to signal rebrand intent

### 0.3.2 — 2026-03-23

Compact recall format, query refinement, and context budget controls.

- `recallMode` config option (`"auto" | "ondemand"`) — disable auto-injection while keeping tools available
- `maxRecallChars` config option — hard cap on total injected recall characters (default: 1500)
- Compact injection format — numbered list with title, percent match, 120-char content, Type/ID/Tags
- Query trimming — recall hook trims user prompt to first 200 chars, drops punctuation-only lines
- `recallStrategy` field in injected header
- ID and tags pass-through in recalled memories
- Default `maxRecallResults` changed from 8 to 5

### 0.3.1 — 2026-03-22

Security scanner clean-up patch.

- Replaced `new Function("specifier", "return import(specifier)")` keytar loader with direct `import("keytar")`
- Removed `child_process` / Python fallback from SQLite extractor
- SQLite extractor now uses `bun:sqlite` → `node:sqlite` (Node 22.5+) → graceful error

### 0.3.0 — 2026-03-22

Cross-agent memory, embedding profiles, markdown/SQLite extraction, full settings surface.

- Markdown extractor (`.md`/`.mdx`, heading-section splits)
- SQLite extractor (OpenClaw `chunks` table, auto-detects embedding model)
- Tiered cross-agent recall: personal (agentId-scoped) → shared (sharedNamespace) → dedup
- Shared namespace routing for `knowledge`/`project`/`reference` types
- Embedding profile contract: provider, model, dimensions, profileId stamping and mismatch detection
- Operator settings: `memoryMode`, `sharedNamespace`, `syncMode`, `queueOnFailure`, `autoIndexOnFirstUse`

### 0.2.0 — 2026-03-21

OpenClaw session-ingestion and REST-alignment update.

- `openclaw-session` JSONL extraction format for nested session logs
- Extraction coverage for `message.role` plus nested `message.content[]` text blocks
- Canonical REST-first behavior with compatibility aliases

### 0.1.0 — 2026-03-11

Initial stable publish.

- `openclaw recall` memory CRUD commands
- Agent tools: `memory_search`, `memory_get`, `memory_store`, `memory_forget`
- Duplicate detection with configurable `dedupeThreshold`
- Full UUID and unambiguous ID prefix support
