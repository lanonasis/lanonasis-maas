#!/usr/bin/env bash
# backfill-releases.sh
#
# For every npm package in .github/release-packages.json that has npm: true,
# look at every published version that does NOT yet have a matching
# `<tag>-v<version>` GitHub Release tag. Print the backfill plan in --dry-run
# mode, or run it for real otherwise.
#
# - Pure bash, no external dependencies beyond npm + gh.
# - Uses `npm pack <name>@<version>` (NO rebuild) so the tarball is byte-for-byte
#   what the registry ships.
# - Marks only the newest version per package as "Latest" on GitHub.
# - Does NOT publish to npm or delete existing tags. It only attaches tarballs
#   to GitHub Releases (Guardrail 3).
#
# Flags:
#   --dry-run               Print the plan, do not change anything (default).
#   --run                   Execute the plan.
#   --manifest <path>       Path to release-packages.json.
#                           (default: ./.github/release-packages.json)
#   --remote <name>         Git remote for the gh release create call.
#                           (default: origin)

set -euo pipefail

DRY_RUN=1
MANIFEST="./.github/release-packages.json"
REMOTE="origin"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --run)     DRY_RUN=0 ;;
    --manifest) MANIFEST="$2"; shift ;;
    --remote)   REMOTE="$2"; shift ;;
    -h|--help)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      echo "backfill-releases.sh: unknown arg: $1" >&2
      exit 2
      ;;
  esac
  shift
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f "$MANIFEST" ]]; then
  echo "backfill-releases.sh: manifest not found: $MANIFEST" >&2
  exit 2
fi

echo "=== backfill-releases.sh ==="
echo "manifest:  $MANIFEST"
echo "dry-run:   $DRY_RUN"
echo "remote:    $REMOTE"
echo

# Stable machine-parseable section: one TSV row per (package, version, status).
# Columns: PACKAGE  TAG  VERSION  STATUS  ACTION
echo "PACKAGE\tTAG\tVERSION\tSTATUS\tACTION"

# Iterate over the npm "packages" array. Use python3 (always present in CI) to
# parse JSON — robust and avoids fragile jq assumptions.
python3 - "$MANIFEST" <<'PY' > /tmp/backfill_entries.tsv
import json, sys
with open(sys.argv[1]) as fh:
    m = json.load(fh)
for entry in m.get("packages", []):
    if entry.get("npm") is True:
        print(f"{entry['name']}\t{entry['tag']}")
PY

TOTAL=0
SKIP=0
PLAN=0
DONE=0
ERRORS=0

while IFS=$'\t' read -r NAME TAG; do
  [[ -z "$NAME" ]] && continue
  TOTAL=$((TOTAL + 1))

  # Discover published versions from the registry. `npm view ... versions --json`
  # returns a JSON array; tolerate failure gracefully (offline registry).
  if ! VERSIONS_JSON="$(npm view "$NAME" versions --json --registry=https://registry.npmjs.org 2>/dev/null)"; then
    printf '%s\t%s\t-\tERROR\tnpm view failed (offline or package missing on registry)\n' "$NAME" "${TAG}" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Parse JSON array of version strings.
  if ! VERSIONS="$(printf '%s' "$VERSIONS_JSON" | python3 -c 'import json,sys; vs=json.load(sys.stdin); print("\n".join(vs))')"; then
    printf '%s\t%s\t-\tERROR\tcould not parse versions JSON\n' "$NAME" "${TAG}" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  if [[ -z "$VERSIONS" ]]; then
    printf '%s\t%s\t-\tSKIP\tno published versions\n' "$NAME" "${TAG}"
    SKIP=$((SKIP + 1))
    continue
  fi

  # Find the newest version (max by semver-ish string comparison is fine for
  # the backfill plan; the registry only carries canonical versions).
  LATEST="$(printf '%s\n' "$VERSIONS" | sort -V | tail -n 1)"

  # Derive the GitHub owner/repo slug for `gh` commands.
  GH_REPO="$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)"
  if [[ -z "$GH_REPO" ]]; then
    GH_REPO="$(git remote get-url "$REMOTE" | sed -E 's#.*github.com[:/](.+)\.git#\1#')"
  fi

  while IFS= read -r VERSION; do
    [[ -z "$VERSION" ]] && continue
    FULL_TAG="${TAG}-v${VERSION}"
    # Check whether a GitHub Release with this tag already exists.
    if gh release view "$FULL_TAG" --repo "$GH_REPO" >/dev/null 2>&1; then
      printf '%s\t%s\t%s\tSKIP\trelease %s already exists\n' "$NAME" "${TAG}" "$VERSION" "$FULL_TAG"
      SKIP=$((SKIP + 1))
      continue
    fi

    IS_LATEST=""
    if [[ "$VERSION" == "$LATEST" ]]; then
      IS_LATEST="Latest"
    fi

    if [[ "$DRY_RUN" -eq 1 ]]; then
      if [[ -n "$IS_LATEST" ]]; then
        printf '%s\t%s\t%s\tPLAN\tnpm pack %s@%s → gh release create %s (mark Latest)\n' "$NAME" "${TAG}" "$VERSION" "$NAME" "$VERSION" "$FULL_TAG"
      else
        printf '%s\t%s\t%s\tPLAN\tnpm pack %s@%s → gh release create %s\n' "$NAME" "${TAG}" "$VERSION" "$NAME" "$VERSION" "$FULL_TAG"
      fi
      PLAN=$((PLAN + 1))
      continue
    fi

    # Live path
    TMPDIR="$(mktemp -d)"
    TGZ="${TMPDIR}/$(basename "$(npm pack "$NAME@$VERSION" --registry=https://registry.npmjs.org 2>/dev/null | tail -n1)")"
    if [[ ! -f "$TGZ" ]]; then
      printf '%s\t%s\t%s\tERROR\tnpm pack produced no file\n' "$NAME" "${TAG}" "$VERSION"
      rm -rf "$TMPDIR"
      ERRORS=$((ERRORS + 1))
      continue
    fi
    SHA_FILE="${TMPDIR}/$(basename "$TGZ").sha256"
    (cd "$TMPDIR" && shasum -a 256 "$(basename "$TGZ")" > "$(basename "$SHA_FILE")")

    NOTES="# Backfill
Package: ${NAME}
Version: ${VERSION}
Source:  npm registry ($(npm view "$NAME@$VERSION" _id --registry=https://registry.npmjs.org 2>/dev/null || echo "unknown"))

## Install
\`\`\`sh
npm i https://github.com/${REMOTE%%/*}/${REMOTE#*/}/releases/download/${FULL_TAG}/$(basename "$TGZ")
\`\`\`
"
    if gh release create "$FULL_TAG" "$TGZ" "$SHA_FILE" --title "$FULL_TAG" --notes "$NOTES" $([[ -n "$IS_LATEST" ]] && echo "--latest") >/dev/null; then
      printf '%s\t%s\t%s\tDONE\tcreated release %s\n' "$NAME" "${TAG}" "$VERSION" "$FULL_TAG"
      DONE=$((DONE + 1))
    else
      printf '%s\t%s\t%s\tERROR\tgh release create failed\n' "$NAME" "${TAG}" "$VERSION"
      ERRORS=$((ERRORS + 1))
    fi
    rm -rf "$TMPDIR"
  done <<< "$VERSIONS"
done < /tmp/backfill_entries.tsv

rm -f /tmp/backfill_entries.tsv

echo
echo "=== summary ==="
echo "packages: $TOTAL"
echo "planned:  $PLAN"
echo "done:     $DONE"
echo "skipped:  $SKIP"
echo "errors:   $ERRORS"

if [[ "$ERRORS" -gt 0 ]]; then
  exit 1
fi
exit 0