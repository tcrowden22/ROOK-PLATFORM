#!/bin/bash

# Rook Platform - Google Cloud Deployment Script
# Usage: ./deploy_gcp.sh

set -e # Exit on error

# Configuration
PROJECT_ID="rook-e97c5"
REGION="us-central1"
DB_INSTANCE_NAME="rook-db"
DB_NAME="rook"
DB_USER="rook_user"
REPO_NAME="rook-repo"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment for project: ${PROJECT_ID}${NC}"

# Check for gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}Error: gcloud CLI is not installed.${NC}"
    echo "Please install it: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Generate Passwords
DB_ROOT_PASSWORD=$(openssl rand -base64 16)
DB_USER_PASSWORD=$(openssl rand -base64 16)
echo -e "${GREEN}Generated secure passwords for deployment.${NC}"

# 1. Setup & APIs
echo -e "${YELLOW}Enabling necessary Google Cloud APIs...${NC}"
gcloud services enable run.googleapis.com \
    sqladmin.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    --project $PROJECT_ID

# 2. Database Setup
echo -e "${YELLOW}Checking Database Instance...${NC}"
if ! gcloud sql instances describe $DB_INSTANCE_NAME --project $PROJECT_ID &>/dev/null; then
    echo -e "Creating Cloud SQL instance (this may take 5-10 minutes)..."
    # read -s -p "Enter new password for Database Root User: " DB_ROOT_PASSWORD
    # echo ""
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_16 \
        --cpu=2 --memory=4GiB \
        --region=$REGION \
        --root-password=$DB_ROOT_PASSWORD \
        --project $PROJECT_ID
else
    echo -e "${GREEN}Database instance $DB_INSTANCE_NAME already exists.${NC}"
fi

echo -e "${YELLOW}Setting up Database and User...${NC}"
# Create DB if not exists
if ! gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE_NAME --project $PROJECT_ID &>/dev/null; then
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME --project $PROJECT_ID
fi

# Create User if not exists
if ! gcloud sql users describe $DB_USER --instance=$DB_INSTANCE_NAME --project $PROJECT_ID &>/dev/null; then
    # read -s -p "Enter new password for App DB User ($DB_USER): " DB_USER_PASSWORD
    # echo ""
    gcloud sql users create $DB_USER --instance=$DB_INSTANCE_NAME --password=$DB_USER_PASSWORD --project $PROJECT_ID
else
    echo -e "User $DB_USER exists. Resetting password to ensure connectivity..."
    gcloud sql users set-password $DB_USER --instance=$DB_INSTANCE_NAME --password=$DB_USER_PASSWORD --project $PROJECT_ID
fi

# Get Connection Name
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)" --project $PROJECT_ID)
echo -e "${GREEN}Database Connection Name: $DB_CONNECTION_NAME${NC}"

# 3. Artifact Registry
echo -e "${YELLOW}Setting up Artifact Registry...${NC}"
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION --project $PROJECT_ID &>/dev/null; then
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Rook Platform Docker Repository" \
        --project $PROJECT_ID
fi

# 4. Deploy Backend API
echo -e "${YELLOW}Building and Deploying Backend API...${NC}"
cd apps/api
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/rook-api . --project $PROJECT_ID

echo -e "Deploying API to Cloud Run..."
gcloud run deploy rook-api \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/rook-api \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="DATABASE_URL=postgresql://$DB_USER:$DB_USER_PASSWORD@localhost/$DB_NAME?host=/cloudsql/$DB_CONNECTION_NAME" \
    --set-env-vars="API_PORT=3000" \
    --set-env-vars="CORS_ORIGIN=*" \
    --add-cloudsql-instances=$DB_CONNECTION_NAME \
    --project $PROJECT_ID

API_URL=$(gcloud run services describe rook-api --region $REGION --format="value(status.url)" --project $PROJECT_ID)
echo -e "${GREEN}API Deployed at: $API_URL${NC}"
cd ../..

# 5. Deploy Frontend
echo -e "${YELLOW}Building and Deploying Frontend...${NC}"
cd apps/frontend
# We need to pass the API URL to the build
echo -e "Building Frontend with VITE_API_URL=$API_URL"

# Create a cloudbuild.yaml dynamically to inject the env var
cat > cloudbuild.yaml <<EOF
steps:
- name: 'node:20'
  entrypoint: 'npm'
  args: ['install']
- name: 'node:20'
  entrypoint: 'npm'
  args: ['run', 'build']
  env:
  - 'VITE_API_URL=$API_URL'
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', '$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/rook-frontend', '.']
images:
- '$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/rook-frontend'
EOF

gcloud builds submit --config cloudbuild.yaml . --project $PROJECT_ID
rm cloudbuild.yaml # Cleanup

echo -e "Deploying Frontend to Cloud Run..."
gcloud run deploy rook-frontend \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/rook-frontend \
    --region $REGION \
    --allow-unauthenticated \
    --port 80 \
    --project $PROJECT_ID

FRONTEND_URL=$(gcloud run services describe rook-frontend --region $REGION --format="value(status.url)" --project $PROJECT_ID)
echo -e "${GREEN}Frontend Deployed at: $FRONTEND_URL${NC}"
cd ../..

# 6. Update API CORS
echo -e "${YELLOW}Updating API CORS to allow Frontend...${NC}"
gcloud run services update rook-api \
    --region $REGION \
    --set-env-vars="CORS_ORIGIN=$FRONTEND_URL" \
    --project $PROJECT_ID

echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "Frontend: $FRONTEND_URL"
echo -e "API: $API_URL"
echo -e ""
echo -e "${YELLOW}=== CREDENTIALS (SAVE THESE) ===${NC}"
echo -e "DB Root Password: $DB_ROOT_PASSWORD"
echo -e "DB User Password: $DB_USER_PASSWORD"
echo -e "====================================="
