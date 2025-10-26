#!/usr/bin/env bash

set -euo pipefail

show_help() {
  cat <<'EOF'
Usage: publish-sdk.sh [--skip-verify] [--dry-run]

Publishes @lanonasis/memory-client to both npmjs.org and GitHub Packages.

Environment variables:
  NPM_TOKEN       Auth token with publish rights to npmjs.org (required)
  GH_TOKEN        GitHub Packages token with write:packages scope (or set GITHUB_TOKEN)

Options:
  --skip-verify   Skip lint/type-check/build before publishing.
  --dry-run       Pass --dry-run to npm publish for verification without uploading.
  -h, --help      Show this help message.
EOF
}

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PACKAGE_DIR"

SKIP_VERIFY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-verify)
      SKIP_VERIFY=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

if [[ -z "${NPM_TOKEN:-}" ]]; then
  echo "NPM_TOKEN is required in the environment." >&2
  exit 1
fi

GH_TOKEN_VALUE="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [[ -z "${GH_TOKEN_VALUE}" ]]; then
  echo "GH_TOKEN or GITHUB_TOKEN with write:packages scope is required." >&2
  exit 1
fi

if [[ "${SKIP_VERIFY}" == "false" ]]; then
  npm run lint
  npm run type-check
  npm run build
fi

TMP_NPMRC="$(mktemp)"
TMP_GHRC="$(mktemp)"
cleanup() {
  rm -f "$TMP_NPMRC" "$TMP_GHRC"
}
trap cleanup EXIT

cat <<EOF > "$TMP_NPMRC"
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
always-auth=true
EOF

cat <<EOF > "$TMP_GHRC"
@lanonasis:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GH_TOKEN_VALUE}
always-auth=true
EOF

PUBLISH_FLAGS=()
if [[ "${DRY_RUN}" == "true" ]]; then
  PUBLISH_FLAGS+=(--dry-run)
fi

echo "Publishing to npm (registry.npmjs.org)..."
if [[ "${#PUBLISH_FLAGS[@]}" -gt 0 ]]; then
  npm publish --userconfig "$TMP_NPMRC" --access public "${PUBLISH_FLAGS[@]}"
else
  npm publish --userconfig "$TMP_NPMRC" --access public
fi

echo "Publishing to GitHub Packages (npm.pkg.github.com)..."
if [[ "${#PUBLISH_FLAGS[@]}" -gt 0 ]]; then
  npm publish --userconfig "$TMP_GHRC" --registry https://npm.pkg.github.com "${PUBLISH_FLAGS[@]}"
else
  npm publish --userconfig "$TMP_GHRC" --registry https://npm.pkg.github.com
fi

echo "Publish routine finished."
