# Quick Start Guide

## Prerequisites
- Node.js 20+ (✅ Installed via nvm)
- PostgreSQL 16+ OR Docker
- npm packages (✅ Installed)

## Step-by-Step Startup

### 1. Start Database (REQUIRED FIRST)

**With Docker:**
```bash
cd /home/tcrowden/rook-platform
docker-compose up -d postgres
# Wait ~10 seconds for PostgreSQL to initialize
```

**Without Docker:**
- Install PostgreSQL 16+
- Create database: `createdb rook`
- Run init scripts from `db/init/` directory

### 2. Run Migrations
```bash
cd apps/api
npm run db:migrate
```

### 3. Seed Database (Optional - creates test users)
```bash
npm run db:seed
```

### 4. Start Backend API
In one terminal:
```bash
cd apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm run dev
```
Backend will start on http://localhost:8000

### 5. Start Frontend
In another terminal:
```bash
cd /home/tcrowden/rook-platform
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm run dev
```
Frontend will start on http://localhost:5173

### 6. Access the Website
Open your browser to: http://localhost:5173

## Default Test Users (after seeding)
- admin@rook.local / (password from seed script)
- agent@rook.local / (password from seed script)
- user@rook.local / (password from seed script)

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running: `docker ps` or `pg_isready`
- Verify DATABASE_URL in `apps/api/.env`

**Frontend can't connect to backend:**
- Verify VITE_API_URL in root `.env` is `http://localhost:8000`
- Check backend is running on port 8000
- Check CORS_ORIGIN in `apps/api/.env` includes `http://localhost:5173`

**Database connection errors:**
- Ensure PostgreSQL is running
- Check connection string in `apps/api/.env`
- Verify database `rook` exists
