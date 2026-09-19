#!/usr/bin/env bash
# backfill-releases.sh
#
# For every package in .github/release-packages.json (plus the CLI), find each
# version already published on npmjs.org that has no `<tag>-v<version>` GitHub
# Release, and create one with the registry tarball + sha256 attached.
#
# - Uses `npm pack <name>@<version>` from the registry (NO rebuild), so the
#   attached tarball is byte-for-byte what npm ships.
# - Tags each release at the first commit on <remote>/main whose package.json
#   carried that version. Falls back to main HEAD (and says so in the notes)
#   when that commit can't be found.
# - Only the newest CLI release is marked "Latest" (GitHub keeps one Latest
#   per repo); everything else is created with --latest=false.
# - Never publishes to npmjs.org and never deletes tags.
#
# Flags:
#   --dry-run               Print the plan, do not change anything (default).
#   --run                   Execute the plan.
#   --only <tag>            Restrict to one manifest tag (e.g. repl-cli, cli).
#   --gh-packages           Also publish each package's newest registry tarball
#                           to npm.pkg.github.com (needs write:packages).
#   --manifest <path>       Path to release-packages.json.
#                           (default: ./.github/release-packages.json)
#   --remote <name>         Git remote holding main (default: origin).

set -euo pipefail

DRY_RUN=1
ONLY=""
GH_PACKAGES=0
MANIFEST="./.github/release-packages.json"
REMOTE="origin"
GH_REPO="lanonasis/lanonasis-maas"
NPMJS="https://registry.npmjs.org"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --run)     DRY_RUN=0 ;;
    --only)    ONLY="$2"; shift ;;
    --gh-packages) GH_PACKAGES=1 ;;
    --manifest) MANIFEST="$2"; shift ;;
    --remote)   REMOTE="$2"; shift ;;
    -h|--help)
      sed -n '2,26p' "$0"
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

git fetch -q "$REMOTE" main
MAIN_REF="${REMOTE}/main"
MAIN_SHA="$(git rev-parse "$MAIN_REF")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "=== backfill-releases.sh ==="
echo "manifest:    $MANIFEST"
echo "dry-run:     $DRY_RUN"
echo "only:        ${ONLY:-(all)}"
echo "gh-packages: $GH_PACKAGES"
echo "main:        $MAIN_REF @ ${MAIN_SHA:0:8}"
echo

# One row per entry: NAME  TAG  DIR. The CLI isn't in the manifest (it has its
# own workflow) but its published versions still need releases.
python3 - "$MANIFEST" <<'PY' > "$WORK/entries.tsv"
import json, sys
m = json.load(open(sys.argv[1]))
print("@lanonasis/cli\tcli\tcli")
for e in m.get("packages", []):
    print(f"{e['name']}\t{e['tag']}\t{e['dir']}")
PY

if [[ "$GH_PACKAGES" -eq 1 && "$DRY_RUN" -eq 0 ]]; then
  GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
  export GITHUB_TOKEN
  printf '%s\n' \
    '//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}' \
    '@lanonasis:registry=https://npm.pkg.github.com' > "$WORK/gh.npmrc"
fi

printf 'PACKAGE\tVERSION\tSTATUS\tACTION\n'
PLAN=0; DONE=0; SKIP=0; ERRORS=0

# First commit on main where <dir>/package.json declared this version.
source_commit() {
  local dir="$1" version="$2"
  git log "$MAIN_REF" --reverse --format=%H \
    -S"\"version\": \"${version}\"" -- "${dir}/package.json" 2>/dev/null | head -n1 || true
}

while IFS=$'\t' read -r NAME TAG DIR; do
  [[ -z "$NAME" ]] && continue
  [[ -n "$ONLY" && "$TAG" != "$ONLY" ]] && continue

  if ! VERSIONS_JSON="$(npm view "$NAME" versions --json --registry="$NPMJS" 2>/dev/null)"; then
    printf '%s\t-\tSKIP\tnot on npmjs.org\n' "$NAME"
    SKIP=$((SKIP + 1))
    continue
  fi
  VERSIONS="$(printf '%s' "$VERSIONS_JSON" | python3 -c 'import json,sys; v=json.load(sys.stdin); v=[v] if isinstance(v,str) else v; print("\n".join(v))')"
  LATEST="$(printf '%s\n' "$VERSIONS" | sort -V | tail -n1)"

  while IFS= read -r VERSION; do
    [[ -z "$VERSION" ]] && continue
    FULL_TAG="${TAG}-v${VERSION}"

    if gh release view "$FULL_TAG" --repo "$GH_REPO" >/dev/null 2>&1; then
      printf '%s\t%s\tSKIP\trelease %s exists\n' "$NAME" "$VERSION" "$FULL_TAG"
      SKIP=$((SKIP + 1))
      continue
    fi
    # Legacy releases used bare `v<version>` tags (v3.10.0 = CLI, v1.0.0 =
    # memory-client); don't duplicate them. Match on the release title.
    LEGACY_TITLE="$(gh release view "v${VERSION}" --repo "$GH_REPO" --json name -q .name 2>/dev/null || true)"
    if [[ -n "$LEGACY_TITLE" ]] && grep -qiE "(^|[^a-z-])${TAG}([^a-z-]|$)" <<< "$LEGACY_TITLE"; then
      printf '%s\t%s\tSKIP\tlegacy release v%s exists\n' "$NAME" "$VERSION" "$VERSION"
      SKIP=$((SKIP + 1))
      continue
    fi

    TARGET="$(source_commit "$DIR" "$VERSION")"
    TARGET_NOTE="Tagged at the commit that introduced this version."
    if [[ -z "$TARGET" ]]; then
      TARGET="$MAIN_SHA"
      TARGET_NOTE="The exact source commit could not be identified; tagged at main when backfilled."
    fi
    TAG_EXISTS=0
    git ls-remote --tags --quiet "$REMOTE" "refs/tags/${FULL_TAG}" | grep -q . && TAG_EXISTS=1

    LATEST_FLAG="--latest=false"
    [[ "$TAG" == "cli" && "$VERSION" == "$LATEST" ]] && LATEST_FLAG="--latest"

    if [[ "$DRY_RUN" -eq 1 ]]; then
      where="${TARGET:0:8}"; [[ "$TAG_EXISTS" -eq 1 ]] && where="existing tag"
      printf '%s\t%s\tPLAN\trelease %s @ %s %s\n' "$NAME" "$VERSION" "$FULL_TAG" "$where" "$([[ "$LATEST_FLAG" == "--latest" ]] && echo "(Latest)")"
      PLAN=$((PLAN + 1))
      continue
    fi

    DEST="$WORK/${TAG}-${VERSION}"; mkdir -p "$DEST"
    TGZ_NAME="$(npm pack "${NAME}@${VERSION}" --registry="$NPMJS" --pack-destination "$DEST" --silent 2>/dev/null | tail -n1)"
    TGZ="$DEST/$TGZ_NAME"
    if [[ -z "$TGZ_NAME" || ! -f "$TGZ" ]]; then
      printf '%s\t%s\tERROR\tnpm pack produced no file\n' "$NAME" "$VERSION"
      ERRORS=$((ERRORS + 1))
      continue
    fi
    (cd "$DEST" && shasum -a 256 "$TGZ_NAME" > "${TGZ_NAME}.sha256")

    INSTALL_FLAGS="--allow-remote=root"
    [[ "$TAG" == "cli" ]] && INSTALL_FLAGS="-g --allow-remote=root"
    NOTES="$(printf '# %s v%s\n\nBackfilled from the npm registry: the attached tarball is exactly what `npm i %s@%s` installs.\n%s\n\n## Install\n\n```sh\nnpm i %s@%s\n```\n\nStraight from this release (no auth; `--allow-remote=root` is needed on npm 12+):\n\n```sh\nnpm i %s https://github.com/%s/releases/download/%s/%s\n```\n' \
      "$NAME" "$VERSION" "$NAME" "$VERSION" "$TARGET_NOTE" "$NAME" "$VERSION" "$INSTALL_FLAGS" "$GH_REPO" "$FULL_TAG" "$TGZ_NAME")"

    TARGET_ARGS=(--target "$TARGET")
    [[ "$TAG_EXISTS" -eq 1 ]] && TARGET_ARGS=()
    if gh release create "$FULL_TAG" "$TGZ" "${TGZ}.sha256" \
        --repo "$GH_REPO" "${TARGET_ARGS[@]}" \
        --title "${NAME} v${VERSION}" --notes "$NOTES" "$LATEST_FLAG" >/dev/null; then
      printf '%s\t%s\tDONE\tcreated %s\n' "$NAME" "$VERSION" "$FULL_TAG"
      DONE=$((DONE + 1))
    else
      printf '%s\t%s\tERROR\tgh release create failed\n' "$NAME" "$VERSION"
      ERRORS=$((ERRORS + 1))
      continue
    fi

    if [[ "$GH_PACKAGES" -eq 1 && "$VERSION" == "$LATEST" ]]; then
      if npm view "${NAME}@${VERSION}" version --registry=https://npm.pkg.github.com --userconfig "$WORK/gh.npmrc" >/dev/null 2>&1; then
        printf '%s\t%s\tSKIP\talready on GitHub Packages\n' "$NAME" "$VERSION"
      elif npm publish "$TGZ" --registry=https://npm.pkg.github.com --userconfig "$WORK/gh.npmrc" >/dev/null 2>&1; then
        printf '%s\t%s\tDONE\tpublished to GitHub Packages\n' "$NAME" "$VERSION"
      else
        printf '%s\t%s\tERROR\tGitHub Packages publish failed\n' "$NAME" "$VERSION"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done <<< "$VERSIONS"
done < "$WORK/entries.tsv"

echo
echo "=== summary ==="
echo "planned:  $PLAN"
echo "done:     $DONE"
echo "skipped:  $SKIP"
echo "errors:   $ERRORS"

[[ "$ERRORS" -eq 0 ]]
