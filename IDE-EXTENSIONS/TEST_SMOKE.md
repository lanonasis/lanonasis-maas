# IDE Extensions Smoke Checklist (Cursor / Windsurf / VSCode)

Run after major UI/auth/chat changes.

## Authentication
- OAuth sign-in succeeds; secure storage populated.
- API key auth succeeds; secure storage populated; no plaintext stored.
- Token refresh works after expiry (force by toggling system clock or stub).

## Create / Edit / Delete / Undo
- Create via sidebar form (no empty pre-create); validation blocks empty title/content.
- Inline edit shows errors when empty; save updates memory; cancel restores view.
- Delete shows undo toast; undo restores entry within 5s; timeout finalizes delete.

## Bulk actions
- Multi-select works; bulk tag applies tags; bulk delete removes items with undo per item; bulk export downloads JSON of selected items.

## Templates
- Templates populate the create form; custom tags and type persist; settings-driven templates load (Cursor/Windsurf/VSCode).

## Search
- Search box returns results; highlights correct count; empty search is handled.

## Chat (VSCode @lanonasis)
- `/recall` returns results; `/context` uses file/workspace context; `/refine` returns a refined prompt; default semantic query shows refined suggestion.

## Settings
- `enableBulkActions` and `memoryTemplates` recognized in all extensions.
- Defaults load without errors; toggling bulk actions hides/shows bulk bar.

## Visual/UX
- No blank “New memory” entries on create.
- Undo toast and bulk bar appear only when applicable.

## Error handling
- Network/API errors show user-friendly messages.
- Cancellation doesn’t leave UI stuck in loading.
