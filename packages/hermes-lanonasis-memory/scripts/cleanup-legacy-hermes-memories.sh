#!/usr/bin/env bash
# cleanup-legacy-hermes-memories.sh
#
# Operator-side, READ-ONLY-BY-DEFAULT cleanup for legacy Hermes-written
# junk rows in the remote LanOnasis MaaS bank.
#
# Companion to packages/hermes-lanonasis-memory/docs/cleanup-legacy-hermes-memories.md
#
# SAFETY:
#   - Default mode is DRY-RUN (identify only). No mutation.
#   - --retag is the ONLY mutating mode and it is NON-DESTRUCTIVE
#     (adds class:legacy_context + visibility:private; never deletes).
#   - There is intentionally NO bulk-delete mode.
#
# USAGE:
#   export LANONASIS_API_KEY='<your-valid-key>'   # never echoed by this script
#   ./cleanup-legacy-hermes-memories.sh            # dry-run: list + count
#   ./cleanup-legacy-hermes-memories.sh --retag    # re-tag the matched ids
#
# Requires: curl, python3 (for JSON parsing). No jq dependency.

set -uo pipefail

API_BASE="${LANONASIS_API_BASE:-https://api.lanonasis.com}"
CLIENT_ID="hermes"
: "${LANONASIS_API_KEY:?Set LANONASIS_API_KEY (a valid MaaS key) before running}"

MODE="dry-run"
[ "${1:-}" = "--retag" ] && MODE="retag"

# Legacy junk-title signature (mirrors scope.JUNK_TITLE_PATTERNS).
JUNK_QUERY='"Context (user)" OR "Context (assistant)" OR "Session summary (pre-compress)" OR "user turn" OR response OR "pre-compact" OR "pre-compaction"'

echo "== Mode: ${MODE}  |  API: ${API_BASE}  |  key: <redacted, ${#LANONASIS_API_KEY} chars> =="

# --- 1. Identify (read-only) -------------------------------------------------
RESP="$(curl -sS -G "${API_BASE}/api/v1/memories/search" \
  -H "Authorization: Bearer ${LANONASIS_API_KEY}" \
  -H "X-Lanonasis-Client-Id: ${CLIENT_ID}" \
  --data-urlencode "query=${JUNK_QUERY}" \
  --data-urlencode "limit=200")"

IDS="$(printf '%s' "$RESP" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
mems = d.get("memories") or d.get("data") or []
if isinstance(mems, dict):
    mems = mems.get("memories", [])
import re
pat = re.compile(r"^Context( \(|$)|^Session summary|user turn|^\s*response\s*$|pre-compact", re.I)
for m in mems:
    t = (m.get("title") or "").strip()
    if pat.search(t) and m.get("id"):
        print(m["id"])
')"

COUNT="$(printf '%s\n' "$IDS" | grep -c . || true)"
echo "-- matched legacy-junk ids: ${COUNT}"
printf '%s\n' "$IDS" | grep . | sed 's/^/   /'

if [ "${MODE}" = "dry-run" ]; then
  echo
  echo "Dry-run complete. Re-run with --retag to apply the non-destructive re-tag."
  echo "Re-tag adds: class:legacy_context, visibility:private, source:hermes, retired:<date>"
  exit 0
fi

if [ "${COUNT}" -eq 0 ]; then
  echo "Nothing to re-tag."
  exit 0
fi

# --- 2. Re-tag (non-destructive) --------------------------------------------
RETIRED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RETIRED_DAY="$(date -u +%Y-%m-%d)"
echo "-- Re-tagging ${COUNT} rows (non-destructive)..."
OK=0; FAIL=0
while IFS= read -r ID; do
  [ -z "$ID" ] && continue
  CODE="$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH \
    "${API_BASE}/api/v1/memories/${ID}" \
    -H "Authorization: Bearer ${LANONASIS_API_KEY}" \
    -H "Content-Type: application/json" \
    -H "X-Lanonasis-Client-Id: ${CLIENT_ID}" \
    -d "{\"tags\":[\"class:legacy_context\",\"visibility:private\",\"source:hermes\",\"retired:${RETIRED_DAY}\"],\"metadata\":{\"retired_at\":\"${RETIRED_AT}\",\"retired_reason\":\"pre-h2-junk-title\"}}")"
  if [ "$CODE" = "200" ] || [ "$CODE" = "201" ] || [ "$CODE" = "204" ]; then
    OK=$((OK+1)); echo "   ✓ ${ID} (${CODE})"
  else
    FAIL=$((FAIL+1)); echo "   ✗ ${ID} (${CODE})"
  fi
done <<< "$IDS"

echo "-- Re-tag done: ${OK} ok, ${FAIL} failed."
echo "Retired rows now drop out of class:canonical / class:raw_event searches;"
echo "they remain recoverable via memory_get or tag:retired:${RETIRED_DAY}."
echo "Hard delete is intentionally NOT provided — review after >=30 days."