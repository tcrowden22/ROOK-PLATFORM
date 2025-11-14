# Database Setup Required

PostgreSQL is not currently running. You need to set it up before running migrations.

## Quick Start with Docker

If you have Docker installed:
```bash
docker-compose up -d postgres
```

Wait for it to start, then run:
```bash
cd apps/api
npm run db:migrate
npm run db:seed  # Optional: creates test users
```

## Manual Setup

1. Install and start PostgreSQL 16+
2. Create database: `createdb rook`
3. Run the init scripts in `db/init/` to create roles and schemas
4. Update `apps/api/.env` with correct connection string
5. Run migrations: `cd apps/api && npm run db:migrate`

See SETUP_DATABASE.md for more details.
