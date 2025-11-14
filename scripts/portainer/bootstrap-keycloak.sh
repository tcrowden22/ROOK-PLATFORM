#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.portainer.yml}
ENV_FILE=${ENV_FILE:-.env.portainer}

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

KEYCLOAK_ADMIN_USER=${KEYCLOAK_ADMIN:-admin}
KEYCLOAK_ADMIN_PASS=${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD must be set}
REALM_NAME=${KEYCLOAK_REALM:-rook}
CLIENT_ID=${KEYCLOAK_CLIENT_ID:-rook-app}
EXTERNAL_HOST=${EXTERNAL_HOST:-localhost}
FRONTEND_PORT=${FRONTEND_PORT:-9001}

compose_exec() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T keycloak /bin/sh -c "$1"
}

echo "🔐 Logging into Keycloak admin CLI..."
compose_exec "/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user ${KEYCLOAK_ADMIN_USER} --password ${KEYCLOAK_ADMIN_PASS}"

echo "🏰 Ensuring realm '${REALM_NAME}' exists..."
if ! compose_exec "/opt/keycloak/bin/kcadm.sh get realms/${REALM_NAME}" >/dev/null 2>&1; then
  compose_exec "/opt/keycloak/bin/kcadm.sh create realms -s realm=${REALM_NAME} -s enabled=true"
fi

echo "📦 Creating/updating client '${CLIENT_ID}'..."
CLIENT_INTERNAL_ID=$(compose_exec "/opt/keycloak/bin/kcadm.sh get clients -r ${REALM_NAME} -q clientId=${CLIENT_ID} --fields id --format csv --noheaders" | tr -d '\r')

CLIENT_JSON=$(cat <<JSON
{
  "clientId": "${CLIENT_ID}",
  "enabled": true,
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "redirectUris": [
    "http://${EXTERNAL_HOST}:${FRONTEND_PORT}/*",
    "http://localhost:${FRONTEND_PORT}/*"
  ],
  "webOrigins": [
    "http://${EXTERNAL_HOST}:${FRONTEND_PORT}",
    "http://${EXTERNAL_HOST}:${FRONTEND_PORT}/",
    "http://localhost:${FRONTEND_PORT}"
  ],
  "protocol": "openid-connect",
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
JSON
)

compose_exec "cat <<'EOF' >/tmp/client.json
${CLIENT_JSON}
EOF"

if [[ -n "${CLIENT_INTERNAL_ID// }" ]]; then
  compose_exec "/opt/keycloak/bin/kcadm.sh update clients/${CLIENT_INTERNAL_ID} -r ${REALM_NAME} -f /tmp/client.json"
else
  compose_exec "/opt/keycloak/bin/kcadm.sh create clients -r ${REALM_NAME} -f /tmp/client.json"
fi

compose_exec "rm -f /tmp/client.json"

echo "🛡️ Ensuring base roles exist..."
for ROLE in admin agent user; do
  compose_exec "/opt/keycloak/bin/kcadm.sh create roles -r ${REALM_NAME} -s name=${ROLE}" >/dev/null 2>&1 || true
done

echo "✅ Keycloak realm '${REALM_NAME}' ready."

