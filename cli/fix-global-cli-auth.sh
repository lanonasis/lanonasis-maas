#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${HOME}/.maas"
CONFIG_FILE="${CONFIG_DIR}/config.json"

mkdir -p "${CONFIG_DIR}"

echo "🔐 Lanonasis MaaS CLI 3.6.4 auth fix"
echo "This will write a persistent token into ${CONFIG_FILE} for the global 'onasis' CLI."
echo

# Prompt for token (supports admin/bypass or any valid CLI/JWT token)
read -r -p "Enter your MaaS access token (paste, then Enter): " TOKEN_INPUT

if [ -z "${TOKEN_INPUT}" ]; then
  echo "❌ No token provided. Aborting."
  exit 1
fi

TOKEN_TRIMMED="$(echo "${TOKEN_INPUT}" | tr -d '[:space:]')"

# Minimal sanity check length; do not over-validate locally
if [ "${#TOKEN_TRIMMED}" -lt 16 ]; then
  echo "❌ Token looks too short. Aborting."
  exit 1
fi

# Build config JSON compatible with CLI 3.6.4 expectations:
# - token: used by status/auth checks
# - authMethod: "jwt"
# - apiUrl: production MaaS API base
# - lastUpdated/lastValidated: metadata only
NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "${CONFIG_FILE}" <<EOF
{
  "version": "1.0.0",
  "apiUrl": "https://api.lanonasis.com/api/v1",
  "token": "${TOKEN_TRIMMED}",
  "authMethod": "jwt",
  "lastUpdated": "${NOW_ISO}",
  "lastValidated": "${NOW_ISO}",
  "mcpPreference": "remote",
  "authFailureCount": 0
}
EOF

chmod 600 "${CONFIG_FILE}"

echo
echo "✅ Updated ${CONFIG_FILE} with a persistent token."
echo "Next step: run 'onasis status' in a new shell to confirm it reports 'Authenticated: Yes'."