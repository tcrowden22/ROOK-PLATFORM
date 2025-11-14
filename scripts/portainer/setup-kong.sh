#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.portainer.yml}
ENV_FILE=${ENV_FILE:-.env.portainer}

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT_DIR"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

echo "🚀 Running Kong database migrations..."
compose run --rm --profile init kong-migrations

echo "🔧 Applying Kong service and route configuration..."
compose run --rm --profile init kong-setup

echo "✅ Kong initialization complete."

