#!/bin/bash
# Kong Setup Script
# Run this script to set up Kong for the first time or after database reset

set -e

echo "=========================================="
echo "Kong Gateway Setup"
echo "=========================================="
echo ""

# Check if Kong database exists
echo "Checking Kong database..."
DB_EXISTS=$(docker compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='kong'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating Kong database..."
  docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE kong;"
  echo "✓ Kong database created"
else
  echo "✓ Kong database already exists"
fi

echo ""
echo "Running Kong migrations..."
docker compose --profile init up kong-migrations

echo ""
echo "Starting Kong..."
docker compose up -d kong

echo ""
echo "Waiting for Kong to be ready..."
sleep 10

echo ""
echo "Configuring Kong routes..."
docker compose --profile init up kong-setup

echo ""
echo "=========================================="
echo "Kong setup complete!"
echo "=========================================="
echo ""
echo "Kong is available at:"
echo "  - Proxy: http://localhost:8000"
echo "  - Metrics: http://localhost:8000/metrics"
echo ""

