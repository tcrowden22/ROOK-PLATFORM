#!/usr/bin/env bash
set -euo pipefail

# Rook Platform - Portainer Deployment Script
# This script automates the deployment process to the Portainer host

HOST="${DEPLOY_HOST:-192.168.7.116}"
DEPLOY_USER="${DEPLOY_USER:-$USER}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/rook-platform}"
COMPOSE_FILE="docker-compose.portainer.yml"
ENV_FILE=".env.portainer"

echo "🚀 Rook Platform - Portainer Deployment Script"
echo "================================================"
echo "Host: $HOST"
echo "User: $DEPLOY_USER"
echo "Path: $DEPLOY_PATH"
echo ""

# Check if we're deploying remotely or locally
if [[ "${REMOTE_DEPLOY:-false}" == "true" ]]; then
  echo "📦 Deploying to remote host via SSH..."
  
  # Create deployment directory
  ssh "$DEPLOY_USER@$HOST" "mkdir -p $DEPLOY_PATH"
  
  # Transfer files (excluding node_modules, .git, etc.)
  echo "📤 Transferring files..."
  rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.local' \
    ./ "$DEPLOY_USER@$HOST:$DEPLOY_PATH/"
  
  # Transfer environment file if it exists
  if [[ -f "$ENV_FILE" ]]; then
    echo "📤 Transferring environment file..."
    scp "$ENV_FILE" "$DEPLOY_USER@$HOST:$DEPLOY_PATH/$ENV_FILE"
  else
    echo "⚠️  Warning: $ENV_FILE not found. You'll need to create it on the server."
  fi
  
  # Build and deploy on remote host
  echo "🔨 Building and deploying on remote host..."
  ssh "$DEPLOY_USER@$HOST" <<EOF
    cd $DEPLOY_PATH
    docker compose -f $COMPOSE_FILE build
    docker compose -f $COMPOSE_FILE up -d
    echo "✅ Deployment complete!"
    echo ""
    echo "Next steps:"
    echo "1. Wait for services to start (check with: docker compose -f $COMPOSE_FILE ps)"
    echo "2. Run migrations: ./scripts/portainer/run-migrations.sh"
    echo "3. Setup Kong: ./scripts/portainer/setup-kong.sh"
    echo "4. Bootstrap Keycloak: ./scripts/portainer/bootstrap-keycloak.sh"
EOF
else
  echo "📋 Local deployment mode - showing manual steps:"
  echo ""
  echo "To deploy manually:"
  echo ""
  echo "1. Transfer files to $HOST:"
  echo "   rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' ./ $DEPLOY_USER@$HOST:$DEPLOY_PATH/"
  echo ""
  echo "2. SSH into the server:"
  echo "   ssh $DEPLOY_USER@$HOST"
  echo ""
  echo "3. Navigate to project directory:"
  echo "   cd $DEPLOY_PATH"
  echo ""
  echo "4. Create .env.portainer from template:"
  echo "   cp env.portainer.example .env.portainer"
  echo "   # Edit .env.portainer with your values"
  echo ""
  echo "5. Build and start services:"
  echo "   docker compose -f $COMPOSE_FILE build"
  echo "   docker compose -f $COMPOSE_FILE up -d"
  echo ""
  echo "6. Run initialization scripts:"
  echo "   ./scripts/portainer/run-migrations.sh"
  echo "   ./scripts/portainer/setup-kong.sh"
  echo "   ./scripts/portainer/bootstrap-keycloak.sh"
  echo ""
  echo "Or set REMOTE_DEPLOY=true and run this script again to automate."
fi

