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

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

echo "🚀 Running API database migrations..."
compose run --rm api npm run db:migrate

if [[ "${RUN_API_SEED:-false}" == "true" ]]; then
  echo "🌱 Seeding API demo data..."
  compose run --rm api npm run db:seed
fi

echo "🚀 Running Gateway database migrations..."
compose run --rm gateway npm run db:migrate

echo "✅ Database migrations completed."

