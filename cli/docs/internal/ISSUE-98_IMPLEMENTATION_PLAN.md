# Issue #98 Implementation Plan (CLI Memory UX Enhancements)

Source runbook: https://github.com/lanonasis/lanonasis-maas/issues/98

## Goals
- Reduce friction when creating memories from the CLI.
- Preserve gateway-centralized routing (`api.lanonasis.com` canonical for `/api/v1/*`).
- Prevent auth persistence cutouts (auto-refresh OAuth sessions).

## Scope (Per Issue #98)
- `lanonasis memory create --json <json>`
- `lanonasis memory create --content-file <path>`
- `lanonasis memory save-session`

## Additions (Requested)
- Patch the CLI so `createMemory()` unwraps `{ data }` (and similarly for get/update where needed), so `ID/Title/Type` never print as `undefined`.
- Patch the CLI auth flow so it auto-refreshes OAuth tokens (`refresh_token` + `token_expires_at`) before running memory commands, instead of intermittently forcing `lanonasis auth login`.

## Acceptance Checks (From Issue Comments)
1. Transport routing
   - With `forceApi=true` or `connectionTransport=api`, memory commands route to `https://api.lanonasis.com`.
   - No request should be sent to `mcp.lanonasis.com` in this mode.
2. Auth precedence
   - If both OAuth/JWT token and vendor key are present, bearer auth is preferred for memory flows.
3. Memory list/search compatibility
   - Validate GET/POST compatibility for list/search semantics.
   - Ensure compatibility across `/api/v1/memory*` and `/api/v1/memories*` aliases where supported.
4. save-session behavior
   - `memory save-session` uses the same transport/auth path as `memory create`.

## Implementation Notes
- Normalize memory create/get/update responses to handle both:
  - direct memory object responses
  - wrapped responses: `{ data: <memory>, message?: string }`
- Token refresh:
  - If `authMethod=oauth` and `token_expires_at` is within 5 minutes (or missing), refresh using `POST {auth_base}/oauth/token` with stored `refresh_token`.
  - Keep the encrypted vendor key in sync when possible so MCP/WebSocket clients can reuse the refreshed access token.

## Testing
- Run CLI unit tests:
  - `nx run @lanonasis/cli-app:test`
- Ensure unit tests do not write to user `~/.maas` config unexpectedly.
