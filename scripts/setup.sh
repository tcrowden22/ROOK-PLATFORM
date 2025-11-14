#!/bin/bash

# Rook Platform - Complete Setup Script
# This script sets up the entire platform from scratch

set -e  # Exit on error

echo "=========================================="
echo "Rook Platform - Complete Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Setup environment file
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env and configure your settings before continuing${NC}"
    echo -e "${YELLOW}⚠ At minimum, set strong passwords for PG_SUPERPASS and PG_APP_PASS${NC}"
    echo ""
    read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set defaults
PG_SUPERUSER=${PG_SUPERUSER:-postgres}
PG_SUPERPASS=${PG_SUPERPASS:-changeme}
PG_DB=${PG_DB:-rook}
PG_PORT=${PG_PORT:-5432}

# Start PostgreSQL
echo "Starting PostgreSQL..."
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose exec -T postgres pg_isready -U "$PG_SUPERUSER" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}Error: PostgreSQL did not become ready in time${NC}"
    exit 1
fi

echo ""

# Initialize database
echo "Initializing database (schemas, roles, privileges)..."
docker compose exec -T postgres psql -U "$PG_SUPERUSER" -d "$PG_DB" < db/init/001_init.sql
echo -e "${GREEN}✓ Database initialized${NC}"
echo ""

# Run migrations (if API directory exists)
if [ -d "apps/api" ]; then
    echo "Running database migrations..."
    cd apps/api
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing API dependencies..."
        npm install
    fi
    
    # Run migrations
    if npm run db:migrate 2>/dev/null; then
        echo -e "${GREEN}✓ Migrations completed${NC}"
    else
        echo -e "${YELLOW}⚠ Migrations not available yet (Phase 2 not completed)${NC}"
    fi
    
    cd ../..
else
    echo -e "${YELLOW}⚠ API directory not found, skipping migrations${NC}"
    echo -e "${YELLOW}⚠ Run 'make db-migrate' after API is set up${NC}"
fi

echo ""

# Seed demo data (if available)
if [ -d "apps/api" ]; then
    echo "Seeding demo data..."
    cd apps/api
    if npm run db:seed 2>/dev/null; then
        echo -e "${GREEN}✓ Demo data seeded${NC}"
    else
        echo -e "${YELLOW}⚠ Seed script not available yet${NC}"
    fi
    cd ../..
else
    echo -e "${YELLOW}⚠ API directory not found, skipping seed${NC}"
fi

echo ""

# Summary
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Database:"
echo "  - PostgreSQL: localhost:${PG_PORT}"
echo "  - Database: ${PG_DB}"
echo "  - User: ${PG_SUPERUSER}"
echo ""
echo "Next steps:"
echo "  1. Start backend API: cd apps/api && npm run dev"
echo "  2. Start frontend: npm run dev"
echo "  3. Access pgAdmin: docker compose --profile tools up -d pgadmin"
echo ""
echo "Useful commands:"
echo "  - make db-psql       - Connect to database"
echo "  - make db-backup      - Create backup"
echo "  - make db-reset       - Reset database (WARNING: deletes data)"
echo ""
echo -e "${GREEN}Happy coding!${NC}"

