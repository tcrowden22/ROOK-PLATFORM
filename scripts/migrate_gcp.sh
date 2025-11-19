#!/bin/bash

# Rook Platform - Google Cloud Migration Script
# Usage: ./migrate_gcp.sh

set -e # Exit on error

# Configuration
PROJECT_ID="rook-e97c5"
REGION="us-central1"
REPO_NAME="rook-repo"
DB_INSTANCE_NAME="rook-db"
DB_NAME="rook"
DB_USER="rook_user"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting database migration for project: ${PROJECT_ID}${NC}"

# Check for gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}Error: gcloud CLI is not installed.${NC}"
    exit 1
fi

# Get Connection Name
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)" --project $PROJECT_ID)
echo -e "${GREEN}Database Connection Name: $DB_CONNECTION_NAME${NC}"

# Prompt for DB Password (since we didn't save it permanently)
echo -e "${YELLOW}Please enter the DB User Password you saved earlier:${NC}"
read -s DB_USER_PASSWORD
echo ""

IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/rook-api:latest"

# 1. Create Migration Job
echo -e "${YELLOW}Creating Migration Job...${NC}"
gcloud run jobs create rook-migrate \
    --image $IMAGE_URI \
    --region $REGION \
    --command "npm" \
    --args "run,db:migrate" \
    --set-env-vars="DATABASE_URL=postgresql://$DB_USER:$DB_USER_PASSWORD@localhost/$DB_NAME?host=/cloudsql/$DB_CONNECTION_NAME" \
    --add-cloudsql-instances=$DB_CONNECTION_NAME \
    --project $PROJECT_ID \
    --execute-now --wait

# 2. Create Seed Job
echo -e "${YELLOW}Creating Seed Job...${NC}"
gcloud run jobs create rook-seed \
    --image $IMAGE_URI \
    --region $REGION \
    --command "npm" \
    --args "run,db:seed" \
    --set-env-vars="DATABASE_URL=postgresql://$DB_USER:$DB_USER_PASSWORD@localhost/$DB_NAME?host=/cloudsql/$DB_CONNECTION_NAME" \
    --add-cloudsql-instances=$DB_CONNECTION_NAME \
    --project $PROJECT_ID \
    --execute-now --wait

echo -e "${GREEN}Migration and Seeding Complete!${NC}"
