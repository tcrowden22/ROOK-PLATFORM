# Quick Deployment Guide

## Option 1: Automated Deployment (if SSH is configured)

If you have SSH key-based authentication set up to 192.168.7.116:

```bash
# Set environment variables
export DEPLOY_HOST=192.168.7.116
export DEPLOY_USER=your-username
export REMOTE_DEPLOY=true

# Run deployment script
./scripts/portainer/deploy.sh
```

## Option 2: Manual Deployment via Portainer UI

### Step 1: Transfer Files to Server

**Option A: Using SCP (from your local machine)**
```bash
# Create directory on server
ssh user@192.168.7.116 "mkdir -p /opt/rook-platform"

# Transfer files (excluding large directories)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '*.log' \
  ./ user@192.168.7.116:/opt/rook-platform/
```

**Option B: Using Git (if repo is accessible)**
```bash
ssh user@192.168.7.116
cd /opt
git clone <your-repo-url> rook-platform
cd rook-platform
```

### Step 2: Create Environment File

On the server:
```bash
cd /opt/rook-platform
cp env.portainer.example .env.portainer
nano .env.portainer  # Edit with your passwords and settings
```

**Important**: Change all default passwords in `.env.portainer`!

### Step 3: Deploy via Portainer

1. **Open Portainer** at `http://192.168.7.116:8000`
2. **Go to Stacks** → **Add Stack**
3. **Name**: `rook-platform`
4. **Build Method**: Select **Repository** or **Web editor**
5. **Repository URL**: If using git, or paste the contents of `docker-compose.portainer.yml`
6. **Compose path**: `docker-compose.portainer.yml`
7. **Environment variables**: 
   - Click **Environment variables**
   - Copy all variables from `.env.portainer` into Portainer's environment section
   - Or upload `.env.portainer` file if Portainer supports it
8. **Deploy the stack**

### Step 4: Build Images (if needed)

If Portainer doesn't build automatically, SSH into server and run:
```bash
cd /opt/rook-platform
docker compose -f docker-compose.portainer.yml build
```

Then redeploy the stack in Portainer.

### Step 5: Initialize Services

SSH into the server and run:

```bash
cd /opt/rook-platform

# 1. Run database migrations
./scripts/portainer/run-migrations.sh

# 2. Setup Kong routes
./scripts/portainer/setup-kong.sh

# 3. Bootstrap Keycloak
./scripts/portainer/bootstrap-keycloak.sh
```

### Step 6: Verify

- Frontend: http://192.168.7.116:9001
- API: http://192.168.7.116:9000/api/healthz
- Keycloak Admin: http://192.168.7.116:9002/auth

## Option 3: I Can Help via SSH

If you want me to help automate the deployment:

1. **Set up SSH key authentication** (if not already done):
   ```bash
   ssh-copy-id user@192.168.7.116
   ```

2. **Let me know your SSH username** and I can:
   - Transfer files automatically
   - Build images on the server
   - Deploy the stack
   - Run initialization scripts

Just tell me:
- Your SSH username
- Whether SSH keys are set up
- If you want me to proceed with automated deployment

