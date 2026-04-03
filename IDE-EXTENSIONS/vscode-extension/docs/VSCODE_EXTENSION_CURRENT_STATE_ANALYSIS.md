# LanOnasis MaaS VSCode Extension Current-State Analysis

Date: 2026-04-03
Author: Codex
Source of truth: `apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension`
Git context: recreated against the current checkout after the prior report file was no longer present

## Executive summary

This refresh rebases the extension analysis on the monorepo copy that actually exists in this workspace, not on the unavailable `/opt/lanonasis/lanonasis-maas` path. The active VSCode runtime is `src/extension.ts`, because the extension package points to `./out/extension.js` and the esbuild bundle is built from `src/extension.ts` (`package.json:29-33`, `esbuild.config.mjs:36-62`). `src/enhanced-extension.ts` still exists, but it behaves like legacy/reference code rather than the current shipped entrypoint.

The biggest correction to the March report is that the extension is more capable than the older summary suggested. The active runtime already includes MCP auto-discovery, shared-core OAuth and secure storage, offline cache/queue wrappers, onboarding, diagnostics, auto-fix/reporting flows, Copilot Chat participation, capture commands beyond editor selection, and an optional React sidebar (`src/extension.ts:31-181`, `src/extension.ts:260-665`, `package.json:247-345`, `package.json:527-652`).

The biggest remaining issues are not missing CRUD foundations. They are version drift, config-store fragmentation, and contract ambiguity between what is shipped, what is only partially wired, and what exists only in legacy code or adjacent interfaces. Intelligence and behavior are still absent from the extension UX, but they are not part of `@lanonasis/memory-client`; they live through CLI and `@lanonasis/mem-intel-sdk` (`cli/src/commands/memory.ts:1393-1765`, `packages/memory-intelligence-engine/mem-intelligence-sdk/src/core/client.ts:181-610`).

## Scope and method

- This report uses only the current monorepo copy under `apps/lanonasis-maas`.
- The active runtime is defined by `package.json` plus the build entrypoint:
  - `package.json:29-33`
  - `esbuild.config.mjs:36-62`
- Capability labels used below:
  - `shipped`: active runtime or shipped default UI path
  - `partial`: settings/classes/contracts exist, but the active runtime does not clearly expose the feature end-to-end
  - `missing`: not exposed by the extension runtime/manifest today
  - `legacy-stale-doc`: present only in dormant codepaths or contradicted by runtime/docs drift

## Current runtime architecture

### Runtime entrypoint and service graph

The activation flow in `src/extension.ts` is the authoritative runtime:

- Creates output/logging and onboarding services (`src/extension.ts:34-37`)
- Auto-discovers MCP servers when `enableMCP` and `mcpAutoDiscover` are enabled (`src/extension.ts:38-54`, `src/services/MCPDiscoveryService.ts:42-137`)
- Builds the shared `@lanonasis/ide-extension-core` adapter and secure credential service (`src/extension.ts:56-69`)
- Chooses `EnhancedMemoryService` first, then falls back to `MemoryService` (`src/extension.ts:81-89`)
- Wraps the base service with `MemoryCache`, `OfflineService`, `OfflineQueueService`, and `OfflineMemoryService` (`src/extension.ts:90-100`)
- Chooses between the original sidebar and the optional React sidebar via `lanonasis.useEnhancedUI` (`src/extension.ts:102-134`, `package.json:633-641`)
- Registers tree providers, completion provider, and Copilot Chat participant (`src/extension.ts:168-190`)
- Registers auth, capture, API key, diagnostics, auto-fix, report-issue, and logging commands (`src/extension.ts:260-665`)

### Auth and shared-core behavior

The active runtime already uses shared secure auth flows from `@lanonasis/ide-extension-core`, including migration away from plaintext settings and OAuth token refresh:

- Shared secure adapter usage: `src/extension.ts:56-69`
- OAuth/API key prompt flow: `src/extension.ts:260-296`
- Shared refresh contract: `packages/ide-extension-core/src/services/SecureApiKeyService.ts:416-422`
- Refresh-token implementation: `packages/ide-extension-core/src/services/SecureApiKeyService.ts:612-682`
- Plaintext `lanonasis.apiKey` migration path: `packages/ide-extension-core/src/services/SecureApiKeyService.ts:477-511`

The real gap is not "missing refresh". It is that the extension, CLI, and adjacent tooling still read or persist auth/config in different places without one published precedence contract.

### UI surfaces

The current extension exposes more than tree views:

- Tree views for memories and API keys: `src/extension.ts:168-171`
- Completion provider for `@`, `#`, and `//`: `src/extension.ts:183-190`
- Copilot Chat participant with `/recall`, `/save`, `/list`, `/context`, and `/refine`: `package.json:45-70`, `src/chat/MemoryChatParticipant.ts:23-117`
- Capture commands for selection, clipboard, and quick capture: `package.json:247-345`, `src/extension.ts:316-323`, `src/extension.ts:618-625`
- Diagnostics, auto-fix, issue report, and log surfacing: `src/extension.ts:524-605`, `src/extension.ts:667-862`
- Legacy/default sidebar webview with bulk actions: `src/panels/MemorySidebarProvider.ts:438-505`, `media/sidebar.js:225-233`, `media/sidebar.js:379-409`
- Optional React sidebar with auth, onboarding, chat, preferences, and connection status messaging: `src/extension.ts:102-134`, `src/panels/EnhancedSidebarProvider.ts:22-245`

### CLI-aware transport behavior

The runtime still prefers the Node SDK's CLI-aware client path rather than the extension-local `TransportManager` abstraction:

- Enhanced service builds `@lanonasis/memory-client/node` config with `preferCLI`, `enableMCP`, `cliDetectionTimeout`, and gateway/direct API routing (`src/services/EnhancedMemoryService.ts:153-195`)
- The Node SDK itself implements CLI-first routing with fallback to direct HTTP (`packages/memory-client/src/node/enhanced-client.ts:1-6`, `packages/memory-client/src/node/enhanced-client.ts:25-38`, `packages/memory-client/src/node/enhanced-client.ts:159-213`)
- MCP discovery is active in the extension runtime (`src/extension.ts:38-54`, `src/services/MCPDiscoveryService.ts:61-137`)

By contrast, the extension-local transport stack is present but not clearly wired into the active runtime:

- Settings exist for `transportPreference`, `websocketUrl`, and `enableRealtime` (`package.json:547-566`)
- `TransportManager`, `HttpTransport`, and `WebSocketTransport` exist (`src/services/transports/TransportManager.ts:1-260`)
- But source usage is limited to the transport module itself; there is no active runtime construction path through `TransportManager` in `src/extension.ts` or `EnhancedMemoryService`

## Capability matrix

| Capability | Status | Evidence | Current interpretation |
| --- | --- | --- | --- |
| Memory CRUD and semantic search | shipped | `package.json:72-125`, `src/extension.ts:298-350`, `src/extension.ts:865-1073` | Core memory create/open/search flows are active. |
| Capture beyond editor selection | shipped | `package.json:247-345`, `src/extension.ts:316-323`, `src/extension.ts:618-625` | The runtime already supports context capture, clipboard capture, and quick capture. |
| Tree views and completions | shipped | `src/extension.ts:168-190` | Explorer views and completion items are part of the active activation flow. |
| Copilot Chat integration | shipped | `package.json:45-70`, `src/extension.ts:173-181`, `src/chat/MemoryChatParticipant.ts:23-117` | The extension already acts as a chat participant, not just a sidebar tool. |
| Offline cache and queue | shipped | `src/extension.ts:90-100`, `src/extension.ts:139-155` | Offline wrappers are active at startup, not just planned. |
| Diagnostics, auto-fix, issue reporting, logs | shipped | `package.json:180-203`, `src/extension.ts:524-605`, `src/extension.ts:667-862` | Support and recovery flows are already in the extension. |
| API key and project management | shipped | `package.json:127-245`, `src/extension.ts:352-405`, `src/extension.ts:1337-1380` | API key lifecycle and project organization are exposed. |
| Optional React sidebar | shipped | `src/extension.ts:102-134`, `package.json:633-641`, `src/panels/EnhancedSidebarProvider.ts:22-245` | Experimental, optional, but real and runtime-selectable. |
| Bulk tag/delete actions | shipped | `package.json:589-593`, `src/panels/MemorySidebarProvider.ts:438-505`, `media/sidebar.js:225-233`, `media/sidebar.js:379-409` | Bulk actions already exist in the default/legacy sidebar path. |
| Local chat session persistence | shipped | `src/hooks/useChatHistory.tsx:54-156`, `src/hooks/useChatHistory.tsx:199-242` | The extension has local session persistence, but it is not MaaS/CLI session parity. |
| CLI-aware routing and status bar connection states | shipped | `src/extension.ts:224-246`, `src/services/EnhancedMemoryService.ts:204-285`, `packages/memory-client/src/node/enhanced-client.ts:159-213` | The extension already distinguishes CLI, CLI+MCP, and HTTP API states. |
| MCP auto-discovery and server details | shipped | `src/extension.ts:38-54`, `src/extension.ts:415-435`, `src/services/MCPDiscoveryService.ts:61-137`, `src/services/MCPDiscoveryService.ts:303-320` | Discovery and operator-facing details are already part of the UX. |
| WebSocket/realtime transport manager | partial | `package.json:547-566`, `src/services/transports/TransportManager.ts:1-260` | Settings and classes exist, but the active runtime is not clearly using them end-to-end. |
| Intelligence and behavior UI in extension | missing | `package.json:44-263`, `src/extension.ts:298-665`, `cli/src/commands/memory.ts:1393-1765`, `packages/memory-intelligence-engine/mem-intelligence-sdk/src/core/client.ts:181-610` | Intelligence exists in CLI/SDK, but there is no extension command/view surface for it. |
| CLI saved-session parity | missing | `package.json:44-263`, `src/extension.ts:298-665`, `cli/src/commands/memory.ts:751-972` | The extension does not expose `save-session`, `list-sessions`, `load-session`, or `delete-session`. |

## Key corrections to the March report

### 1. `src/extension.ts` is the current runtime

This is no longer ambiguous in the build:

- `package.json:29-33` points the extension to `./out/extension.js`
- `esbuild.config.mjs:36-62` builds `out/extension.js` from `src/extension.ts`

`src/enhanced-extension.ts` remains useful as evidence of older UX and mode concepts, but it is not the active runtime entrypoint.

### 2. Auth refresh is implemented

The previous framing that the extension lacks robust OAuth refresh is outdated. Shared-core refresh support already exists:

- `packages/ide-extension-core/src/services/SecureApiKeyService.ts:416-422`
- `packages/ide-extension-core/src/services/SecureApiKeyService.ts:612-682`

The real auth problem is fragmented storage and unclear precedence:

- VSCode secure storage plus settings in the extension (`src/extension.ts:56-69`)
- CLI config in `~/.maas/config.json` (`cli/src/utils/config.ts:135-163`)
- Other consumers reading `~/.lanonasis/*` and `~/.maas/config.json` fallback sources (`packages/recall-forge/client.ts:8-15`, `packages/recall-forge/client.ts:282-298`)

### 3. Intelligence is separate from the CRUD transport client

The extension does not expose intelligence/behavior UI today, but the capability is real and sits outside `@lanonasis/memory-client`:

- CLI imports `MemoryIntelligenceClient` from `@lanonasis/mem-intel-sdk` (`cli/src/commands/memory.ts:8`)
- CLI exposes intelligence and behavior commands (`cli/src/commands/memory.ts:1393-1765`)
- The SDK contract for patterns, tags, related memories, duplicates, insights, health, predictive recall, and behavior learning lives in `packages/memory-intelligence-engine/mem-intelligence-sdk/src/core/client.ts:181-610`
- The CLI package currently depends on `@lanonasis/mem-intel-sdk` `2.1.0` (`cli/package.json:54-56`)

### 4. Bulk operations and sessions need narrower framing

Bulk actions are not wholly absent:

- The default/legacy sidebar already supports bulk delete and bulk tag flows (`src/panels/MemorySidebarProvider.ts:438-505`, `media/sidebar.js:225-233`, `media/sidebar.js:379-409`)

Sessions also are not wholly absent:

- The React chat experience persists local chat sessions in VSCode webview state (`src/hooks/useChatHistory.tsx:54-156`, `src/hooks/useChatHistory.tsx:199-242`)

What is still missing is parity with MaaS/CLI saved sessions:

- CLI `save-session`, `list-sessions`, `load-session`, `delete-session` exist (`cli/src/commands/memory.ts:751-972`)
- No equivalent extension command or tree/view contribution appears in `package.json:44-263` or `src/extension.ts:298-665`

### 5. Transport/realtime should be marked partial, not shipped

The extension does define transport settings and transport classes:

- `package.json:547-566`
- `src/services/transports/TransportManager.ts:1-260`

But the active runtime is built around `EnhancedMemoryService`, MCP discovery, and offline wrappers:

- `src/extension.ts:81-100`
- `src/services/EnhancedMemoryService.ts:153-195`

That means realtime transport orchestration should be tracked as `partial` until the runtime clearly routes through `TransportManager` or intentionally removes the dormant surface.

## Verified drift and compatibility mismatches

The extension currently has multiple conflicting version stories:

| Area | Current evidence | Drift |
| --- | --- | --- |
| Extension package version | `package.json:5` -> `2.1.1` | Current package identity |
| Runtime user agent | `src/extension.ts:64` -> `LanOnasis-Memory/2.0.9` | Older than package version |
| README headline | `README.md:5` -> `v1.4.1` | Far older than package version |
| README "previous updates" | `README.md:26-29` -> `v1.3.2` and CLI `v3.0.6` | Older docs copy |
| README prerequisites/settings | `README.md:54-58`, `README.md:123-127` -> CLI `v3.0.6+` | Different from runtime messaging |
| Active runtime copy | `src/extension.ts:231-239`, `src/extension.ts:1096-1107` -> CLI `v1.5.2+ detected` | Legacy minimum still embedded |
| Legacy/reference entrypoint | `src/enhanced-extension.ts:145-167`, `src/enhanced-extension.ts:365-405` -> CLI `v1.5.2+` copy | Reinforces old contract |
| Actual CLI package version | `cli/package.json:3` -> `3.9.13` | Newer than README and runtime copy |

This is why the next roadmap must start with compatibility hygiene before adding new UX.

## Gap analysis by state

### Missing

- Extension-facing intelligence and behavior commands/views
  - Evidence: no matching command surface in `package.json:44-263` or `src/extension.ts:298-665`
  - Counter-evidence elsewhere: `cli/src/commands/memory.ts:1393-1765`
- MaaS/CLI saved-session parity
  - Evidence: no session command surface in `package.json:44-263` or `src/extension.ts:298-665`
  - Counter-evidence elsewhere: `cli/src/commands/memory.ts:751-972`
- Published config precedence contract
  - Evidence: extension secure storage/settings, CLI `~/.maas/config.json`, and `~/.lanonasis/*` fallbacks coexist without one declared order (`src/extension.ts:56-69`, `cli/src/utils/config.ts:135-163`, `packages/recall-forge/client.ts:8-15`)

### Partial

- Realtime transport orchestration
  - Settings and classes exist, but the active runtime does not clearly drive them (`package.json:547-566`, `src/services/transports/TransportManager.ts:1-260`)
- Bulk-action parity across both sidebar experiences
  - Bulk actions are proven in the default/legacy sidebar, but not clearly in the optional React sidebar (`src/panels/MemorySidebarProvider.ts:438-505`, `src/panels/EnhancedSidebarProvider.ts:96-194`)
- Capability messaging around connection modes
  - Active runtime only exposes Gateway vs Direct API switching (`src/extension.ts:1285-1330`)
  - Legacy/reference runtime still shows Auto, CLI Only, Gateway Only, Direct API (`src/enhanced-extension.ts:407-471`)

### Legacy or stale-doc

- README release/version story (`README.md:5-29`, `README.md:54-58`, `README.md:123-127`)
- Runtime copy that still references CLI `v1.5.2+` as the canonical threshold (`src/extension.ts:231-239`, `src/extension.ts:1096-1107`)
- `src/enhanced-extension.ts` as a second entrypoint-shaped file even though the build targets `src/extension.ts` (`esbuild.config.mjs:36-62`)

## Current-state backlog

| Priority | Item | Subsystem | Why now | Evidence |
| --- | --- | --- | --- | --- |
| P0 | Align docs, version strings, minimum CLI version, and the "active entrypoint" story. Either deprecate or remove `src/enhanced-extension.ts` if it is no longer supported. | extension runtime + docs + CLI contract | Current version drift is large enough to mislead users and contributors. | `package.json:5`, `src/extension.ts:64`, `README.md:5-29`, `src/enhanced-extension.ts:14-25` |
| P0 | Publish a canonical auth/config precedence model across VSCode SecretStorage, VSCode settings, `~/.maas/config.json`, and any `~/.lanonasis/*` fallbacks before adding sync automation. | shared auth/config + CLI + extension runtime | The fragmentation problem is architectural, not cosmetic. | `src/extension.ts:56-69`, `cli/src/utils/config.ts:135-163`, `packages/recall-forge/client.ts:8-15` |
| P1 | Add an extension-facing intelligence adapter and ship command-palette actions first, then decide whether dedicated views are warranted. | extension runtime + intelligence SDK + CLI | The capability already exists in CLI/SDK; the extension needs a deliberate adapter, not a rewrite. | `cli/src/commands/memory.ts:1393-1765`, `packages/memory-intelligence-engine/mem-intelligence-sdk/src/core/client.ts:181-610` |
| P1 | Decide whether CLI saved sessions should be integrated into the extension, or whether local chat sessions should be renamed/scoped so they are not confused with MaaS sessions. | extension runtime + CLI | Session terminology currently conflates two different concepts. | `src/hooks/useChatHistory.tsx:54-156`, `cli/src/commands/memory.ts:751-972` |
| P1 | Either wire `TransportManager` into the active service path with visible fallback/health reporting, or remove/soft-hide transport settings until the runtime really uses them. | extension runtime | Partial wiring creates false expectations about realtime support. | `package.json:547-566`, `src/services/transports/TransportManager.ts:1-260`, `src/extension.ts:81-100` |
| P2 | Re-evaluate "missing UX" claims like visualizer/export needs in light of already-shipped capture, bulk, onboarding, diagnostics, and chat features. | extension runtime + docs/product | The old gap list overstated what was missing and understated what is already shipped. | `package.json:247-345`, `src/extension.ts:524-605`, `src/panels/MemorySidebarProvider.ts:438-505`, `src/chat/MemoryChatParticipant.ts:123-260` |

## Interface decisions this report recommends

1. Keep `@lanonasis/memory-client` as the CRUD/search transport client and treat intelligence as a separate contract backed by `@lanonasis/mem-intel-sdk`.
   - Evidence: active runtime uses `EnhancedMemoryService` plus `@lanonasis/memory-client/node` for CRUD/search (`src/services/EnhancedMemoryService.ts:153-195`)
   - Evidence: intelligence lives in CLI plus `@lanonasis/mem-intel-sdk` (`cli/src/commands/memory.ts:8`, `packages/memory-intelligence-engine/mem-intelligence-sdk/src/core/client.ts:181-610`)

2. Publish one extension capability model that explicitly labels `shipped`, `partial`, and `planned`.
   - This avoids mixing active runtime behavior with dormant transport classes, optional experimental UI, and stale README promises.

3. Publish one compatibility contract for CLI integration.
   - One minimum supported CLI version
   - One source of truth for status-bar messaging
   - One source of truth in docs and runtime copy

## Validation scenarios

### Version consistency

1. Compare extension package version, runtime user agent string, README release headline, and CLI minimum-version copy.
2. Fail validation if those references do not resolve to one published contract.

### Config precedence

1. Authenticate through VSCode OAuth and confirm the extension uses secure storage.
2. Authenticate through CLI and confirm whether the extension reads or ignores `~/.maas/config.json`.
3. Add explicit tests for fallback readers that inspect `~/.lanonasis/*` stores so precedence is documented rather than accidental.

### Intelligence exposure

1. Verify CLI intelligence commands work through `onasis memory intelligence ...`.
2. Confirm that the extension manifest and runtime still have no equivalent extension commands before claiming intelligence parity.
3. When an extension adapter is added, compare extension results to CLI output for the same memory IDs.

### Session behavior

1. Create and autosave local chat sessions in the React sidebar and confirm they persist through VSCode state.
2. Save a CLI session through `onasis memory save-session` and confirm the extension does not currently surface it.
3. Use the result to decide whether to integrate CLI sessions or rename the local chat concept.

### Transport fallback

1. Run with default settings and confirm the active path still uses `EnhancedMemoryService` plus offline wrappers.
2. Toggle `transportPreference`, `websocketUrl`, and `enableRealtime` and confirm whether any user-visible runtime behavior changes.
3. Only mark realtime as shipped after the runtime visibly routes through `TransportManager` or an equivalent active abstraction.

## Bottom line

The VSCode extension is not a thin CRUD shell anymore. It already ships a substantial runtime: secure auth, CLI-aware routing, MCP discovery, offline behavior, capture workflows, chat participation, diagnostics, and optional modern UI. The right next step is not to "catch up from zero". It is to cleanly separate shipped features from partial wiring and stale copy, then add intelligence/session parity on top of a stable compatibility and config contract.
