# Database Setup Instructions

## Option 1: Using Docker (Recommended)

If you have Docker installed, run:
```bash
docker-compose up -d postgres
```

This will start PostgreSQL on port 5432 with:
- Database: `rook`
- User: `postgres`
- Password: `changeme`

## Option 2: Local PostgreSQL

If you have PostgreSQL installed locally:

1. Create the database:
```bash
createdb rook
```

2. Create the application user (if needed):
```sql
CREATE USER rook_app WITH PASSWORD 'changeme_app_password';
GRANT ALL PRIVILEGES ON DATABASE rook TO rook_app;
```

3. Update the `.env` file in `apps/api` with your local connection string.

## After Database is Running

Once PostgreSQL is running, you can proceed with migrations:
```bash
cd apps/api
npm run db:migrate
```

Then optionally seed the database:
```bash
npm run db:seed
```
