# RecallForge

**Secret-safe memory and context engine for OpenClaw.**

RecallForge fills both OpenClaw plugin slots at once:

| Slot | What it does |
|------|-------------|
| `plugins.slots.memory` | Persists knowledge across sessions, devices, and agents via LanOnasis MaaS |
| `plugins.slots.contextEngine` | Builds and injects relevant context into the agent's prompt window on demand |

Every piece of content that enters either slot first passes through a 30-pattern secret redactor. Credentials, tokens, private keys, and connection strings are stripped before they reach memory storage or the context window — not as an afterthought, but as the first step in the pipeline.

## Install

```bash
openclaw plugins install @lanonasis/recall-forge
```

> **Expected install warning:** OpenClaw's static scanner flags any plugin that reads environment variables and makes network requests. You will see:
> ```
> WARNING: Environment variable access combined with network send — possible credential harvesting
> ```
> This is a false positive with a documented explanation. RecallForge reads exactly two `LANONASIS_*` environment variables and sends requests to `api.lanonasis.com` — the service you configured. The credential resolution chain is documented in the module JSDoc in `dist/client.js`. Source is on [GitHub](https://github.com/thefixer3x/lan-onasis-monorepo/tree/main/apps/lanonasis-maas/packages/recall-forge) if you want to verify.

## How it Works

```
User prompt
    │
    ▼
[contextEngine] buildContext(session)
    │   Tiered semantic search: personal → shared namespace
    │   Prompt injection filter
    │   Secret redaction (30+ patterns)
    │   Character budget enforcement
    ▼
Injected context block prepended to prompt
    │
    ▼
Agent runs
    │
    ▼
[memory] capture hook (agent_end / before_compaction)
    │
    ├─ Privacy Guard — Stage 1: secret-redactor (30 patterns — always-on)
    ├─ Privacy Guard — Stage 2: privacy-sdk PII detection/masking
    │     SSN, email, credit card, IBAN, passport, DOB, phone, IP...
    │     Confidence threshold: 0.85 | Luhn + area-code validation
    │     GDPR / CCPA / HIPAA / PCI-DSS compliance tagging
    │
    │   Capture filter (removes low-signal content)
    │   Type detection + tag extraction + privacy tags
    │   Vector dedup (0.985 threshold)
    │   Privacy metadata written to memory.metadata
    ▼
Memory stored in LanOnasis MaaS
    │
    ├─ [if localFallback] workspace/memory/YYYY-MM-DD.md (already sanitized)
    └─ [if privacyNotifyUrl] webhook POST — privacy.intervention event
         (action, piiTypes, regulations, timestamp — never content)
```

The recall hook (`before_agent_start`) and contextEngine are two separate integration surfaces. The recall hook is passive and event-driven. The contextEngine is active — OpenClaw calls `buildContext()` whenever it needs to assemble context, giving RecallForge a direct seat in prompt construction.

### Privacy Shield — What Gets Protected and Where You See It

Every memory that passes through a write path is scanned. When an intervention occurs:

**On the stored memory** (visible in `openclaw recall list` and `openclaw recall get <id>`):
```
Tags:     pii:email  privacy:redacted  compliant:gdpr
Metadata: privacy.action = "redacted+masked"
          privacy.piiTypes = ["email"]
          privacy.regulations = ["GDPR", "CCPA"]
```

**In the daily audit log** (`workspace/memory/privacy/YYYY-MM-DD.md`):
```markdown
| Time     | Action          | Secrets | PII Types | Sensitivity | Regulations |
|----------|-----------------|---------|-----------|-------------|-------------|
| 14:23:01 | redacted+masked | 1       | email     | high        | GDPR, CCPA  |
```

**Via webhook** (if `privacyNotifyUrl` is set):
```json
{
  "event": "privacy.intervention",
  "plugin": "recall-forge",
  "action": "redacted+masked",
  "piiTypes": ["email"],
  "regulations": ["GDPR", "CCPA"],
  "timestamp": "2026-03-26T14:23:01Z"
}
```

## What Gets Redacted

Before content enters memory or context:

| Category | Examples |
|----------|---------|
| Anthropic keys | `sk-ant-api03-...` |
| OpenAI keys | `sk-proj-...`, `sk-...` |
| GitHub tokens | `ghp_...`, `github_pat_...`, `gho_...`, `ghs_...` |
| Supabase keys | `sbp_...`, `sba_...` |
| Stripe keys | `sk_live_...`, `pk_live_...`, `sk_test_...`, `whsec_...` |
| AWS access keys | `AKIA...` |
| Google API keys | `AIzaSy...` |
| Notion tokens | `ntn_...`, `secret_...` |
| LanOnasis keys | `lano_...`, `lns_...` |
| JWT tokens | `eyJ...` three-part format |
| PEM private keys | `-----BEGIN ... PRIVATE KEY-----` blocks |
| Database URLs | `postgres://user:pass@host/db`, `mysql://...`, etc. |
| Bearer tokens | `Bearer <40+ char token>` |
| Env assignments | `API_KEY=value`, `export SECRET=value` |
| Hex secrets | 64+ character hex strings |
| ElevenLabs keys | `el_...` |
| Telegram bots | `123456789:AbCdEfGh...` |

Matched values are replaced with `[REDACTED_<TYPE>]`. The redaction runs before any network call.

## Configuration

Set credentials in `~/.openclaw/.env`:

```bash
LANONASIS_API_KEY=your_key
LANONASIS_PROJECT_ID=your_project_id
```

Or in `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "allow": ["recall-forge"],
    "slots": {
      "memory": "recall-forge",
      "contextEngine": "recall-forge"
    },
    "entries": {
      "recall-forge": {
        "enabled": true,
        "config": {
          "apiKey": "YOUR_LANONASIS_API_KEY",
          "projectId": "YOUR_PROJECT_ID",
          "agentId": "main",
          "captureMode": "hybrid",
          "autoRecall": true,
          "localFallback": true,
          "searchThreshold": 0.75,
          "dedupeThreshold": 0.985,
          "maxRecallResults": 5,
          "maxRecallChars": 1500,
          "memoryMode": "hybrid",
          "sharedNamespace": "",
          "syncMode": "realtime"
        }
      }
    }
  }
}
```

### Config Reference

| Field | Default | Description |
|-------|---------|-------------|
| `apiKey` | — | **Required.** LanOnasis API key |
| `projectId` | — | **Required.** Project ID from dashboard |
| `baseUrl` | `https://api.lanonasis.com` | API base URL |
| `agentId` | `main` | Tags memories with this agent ID |
| `autoRecall` | `true` | Inject memories before each session via recall hook |
| `recallMode` | `auto` | `auto`: inject automatically. `ondemand`: disable auto-injection, tools still available |
| `maxRecallChars` | `1500` | Hard cap on injected recall characters. Use `400–600` for Ollama/small-context models |
| `maxRecallResults` | `5` | Max memories returned per recall |
| `captureMode` | `hybrid` | `auto`: capture everything. `hybrid`: stricter filter. `explicit`: agent calls `memory_store` directly |
| `localFallback` | `true` | Write Markdown copies to `workspace/memory/YYYY-MM-DD.md` |
| `searchThreshold` | `0.75` | Minimum similarity score for recall results. Raise to `0.80` to reduce noise |
| `dedupeThreshold` | `0.985` | Similarity threshold for `memory_store` duplicate detection |
| `memoryMode` | `hybrid` | `remote`: cloud only. `local`: filesystem only. `hybrid`: cloud primary with local fallback |
| `sharedNamespace` | — | Cross-agent shared memory namespace. Empty = disabled |
| `syncMode` | `realtime` | `realtime`: immediate writes. `batch`: deferred. `manual`: explicit only |
| `embeddingProvider` | — | Provider for vector embeddings (e.g. `openai`, `ollama`) |
| `embeddingModel` | — | Embedding model name (e.g. `text-embedding-3-small`) |
| `embeddingProfileId` | — | Stamped into stored memories for mismatch detection |
| `privacyMode` | `mask` | PII protection: `mask` (detect + mask), `detect` (scan + tag only), `off` (credentials only) |
| `privacyLocale` | `US` | PII locale hint: `US`, `UK`, `EU`, `DE`, `FR`, `JP`, `AU`, `CA` |
| `privacyNotifyUrl` | — | Webhook URL for out-of-band privacy intervention events |

## Context Window Management

The contextEngine and recall hook both respect `maxRecallChars`. For **Ollama and small-context models**:

```json
"recallMode": "ondemand",
"maxRecallChars": 500,
"searchThreshold": 0.80,
"maxRecallResults": 3
```

`recallMode: "ondemand"` disables the automatic recall hook. The contextEngine continues to respond to on-demand calls from OpenClaw. Memory tools remain available for manual recall.

## Wiring Agent Guidance

After install, append the memory snippet to your workspace AGENTS.md:

```bash
cat "$(openclaw plugins path recall-forge)/setup/agents-memory.md" >> ~/.openclaw/workspace/AGENTS.md
cat "$(openclaw plugins path recall-forge)/setup/heartbeat-memory.md" >> ~/.openclaw/workspace/HEARTBEAT.md
```

## CLI

```bash
openclaw recall status
openclaw recall create --title "Title" --content "Content"
openclaw recall get <id-or-prefix>
openclaw recall update <id-or-prefix> --title "Updated"
openclaw recall delete <id-or-prefix> --force
openclaw recall search "query" --threshold 0.7 --type knowledge --tags alpha,beta
openclaw recall list --page 1 --sort created_at --order desc
openclaw recall stats
```

The CLI accepts full UUIDs or unambiguous 8+ character prefixes for `get`, `update`, and `delete`.

## Extraction

Import memories from existing session logs, Markdown docs, or SQLite databases. All extraction passes through the same secret redaction pipeline before storing.

**JSONL formats** (auto-detected):
- `openclaw-session` — nested `{ type: "message", message: { role, content[] } }` session logs
- `openclaw-cache` — cache-trace records
- `claude-code` — flat `{ role, content }` session logs
- `codex` — `{ type: "message", sender }` format
- `generic` — fallback for any JSON with text fields

**Document formats** (auto-detected by extension):
- `markdown` — `.md` / `.mdx` files, splits by heading sections
- `sqlite` — `.sqlite` / `.db` files, reads the OpenClaw `chunks` table

```bash
openclaw recall extract ~/.openclaw/agents/main/sessions/sample.jsonl --dry-run
openclaw recall extract ~/.openclaw/workspace/SOUL.md --dry-run
openclaw recall extract ~/.openclaw/memory/main.sqlite --dry-run
```

## Agent Tools

RecallForge registers four tools always available to the agent:

| Tool | Description |
|------|-------------|
| `memory_search` | Semantic search through stored memories |
| `memory_get` | Fetch full memory by ID |
| `memory_store` | Store or update a memory (with auto-dedup) |
| `memory_forget` | Delete a memory by ID |

## Cross-Agent Memory

When `sharedNamespace` is configured, recall uses a tiered strategy:

1. **Personal** — search scoped to `agentId`
2. **Shared** — search scoped to `sharedNamespace`
3. **Deduplicate** — merge by memory ID, personal takes priority
4. **Cap** — trim to `maxRecallResults`, sorted by similarity

Capture routes `knowledge`, `project`, and `reference` type memories to the shared namespace automatically.

## Verification

```bash
npm run typecheck
npm run test
npm run build
npm run pack:dry-run
```

For local testing without publishing:

```bash
cd apps/lanonasis-maas/packages/recall-forge
npm run build
openclaw plugins install "$(pwd)" --link --force
openclaw recall status
```

## Publish

```bash
npm run verify:release
npm publish --access public
git tag recall-forge-v$(node -p "require('./package.json').version")
git push origin main --follow-tags
```

## More Docs

- [SETUP.md](./SETUP.md) — operator setup guide
- [CHANGELOG.md](./CHANGELOG.md) — release history
