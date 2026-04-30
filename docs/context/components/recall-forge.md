# @lanonasis/recall-forge - Component Context

**Package:** `@lanonasis/recall-forge`
**Version:** 1.1.1
**Type:** OpenClaw plugin

---

## Purpose

RecallForge is a secret-safe memory and context engine plugin for OpenClaw. Fills both the `memory` and `contextEngine` slots with tiered semantic recall, 30+ pattern credential redaction, and prompt injection protection.

---

## OpenClaw Integration

**Slots filled:**
- `memory` - Primary memory storage and retrieval
- `contextEngine` - Context management and enrichment

**Extension:** `./dist/index.js`

---

## Key Features

- **Tiered semantic recall**: Multiple memory tiers for optimized retrieval
- **Credential redaction**: 30+ patterns for secret detection and redaction
- **Prompt injection protection**: Security against malicious inputs
- **Privacy-first**: Local processing with optional cloud sync
- **Context engine**: Advanced context management beyond simple storage

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main plugin entry |
| `src/extraction/` | Memory extraction utilities |
| `openclaw.plugin.json` | OpenClaw plugin manifest |
| `SETUP.md` | Setup instructions |
| `setup/` | Setup utilities |
| `.claw/` | OpenClaw configuration |
| `privacy/` | Privacy-related modules |
| `enrichment/` | Context enrichment |
| `hooks/` | Hook scripts |
| `tools/` | OpenClaw tools |

---

## Dependencies

### External
- `@lanonasis/privacy-sdk` (1.0.0) - Privacy utilities
- `undici` (7.24.6) - HTTP client

### Peer Dependencies
- `openclaw` (latest) - Optional, for development

---

## Usage

Install as an OpenClaw plugin:
```bash
openclaw plugin add @lanonasis/recall-forge
```

The plugin automatically:
1. Fills `memory` and `contextEngine` slots
2. Redacts secrets from stored context
3. Provides semantic recall capabilities
4. Protects against prompt injection

---

## Development

```bash
npm run clean             # Remove dist
npm run build            # Compile TypeScript
npm run typecheck        # Type checking
npm run test             # Run tests (vitest)
npm run pack:dry-run     # Test packaging
npm run verify:release    # Full release verification
npm run migrate          # Run migrations (tsx)
```

---

## Integration Points

| Component | How it works |
|-----------|--------------|
| `memory-service` | API backend |
| `@lanonasis/privacy-sdk` | Secret detection and redaction |
| OpenClaw | Plugin system (slots + tools) |
| Claude Code | Via OpenClaw integration |

---

## Architecture Decisions

- **Dual slot filling**: Provides both memory and contextEngine to OpenClaw
- **Privacy SDK**: Leverages dedicated privacy package for redaction
- **Pattern-based redaction**: 30+ credential patterns for comprehensive coverage
- **Tiered recall**: Multiple retrieval tiers for performance