# Rook API Gateway (Geri)

External-facing API gateway service for receiving data from remote agents and writing directly to the database.

## Overview

The Gateway service provides a dedicated entry point for agent communications, handling:
- Agent authentication via API keys
- Telemetry data ingestion
- Device registration and management
- Direct database access

## Architecture

- **Service Name**: Geri (Norse: "Spear")
- **Port**: 35000 (HTTP API)
- **Framework**: Fastify + TypeScript
- **Database**: Direct PostgreSQL connection

## Development

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL (running via Docker Compose)

### Local Development

1. **Install dependencies**:
```bash
cd apps/gateway
npm install
```

2. **Set up environment variables**:
Create a `.env` file or use the defaults:
```env
DATABASE_URL=postgresql://rook_app:changeme_app_password@localhost:5432/rook
GATEWAY_PORT=35000
GATEWAY_HOST=0.0.0.0
API_KEY_SECRET=your-secret-key-min-32-chars
LOG_LEVEL=info
```

3. **Run in development mode**:
```bash
npm run dev
```

The gateway will start on `http://localhost:35000`

### Build for Production

```bash
npm run build
npm start
```

### Docker

The gateway is included in the main `docker-compose.yml`:

```bash
# Build and start gateway
docker compose up -d gateway

# View logs
docker compose logs -f gateway

# Stop gateway
docker compose stop gateway
```

## API Endpoints

### Health & Status

- `GET /healthz` - Health check (liveness)
- `GET /readyz` - Readiness check (database connectivity)
- `GET /metrics` - Prometheus metrics

### Example

```bash
# Health check
curl http://localhost:35000/healthz

# Readiness check
curl http://localhost:35000/readyz

# Metrics
curl http://localhost:35000/metrics
```

## Project Structure

```
apps/gateway/
├── src/
│   ├── config/
│   │   └── env.ts          # Environment configuration
│   ├── lib/
│   │   ├── db/
│   │   │   └── index.ts    # Database connection
│   │   └── errors.ts       # Error handling
│   ├── middleware/
│   │   ├── logger.ts       # Logging middleware
│   │   └── request-id.ts   # Request ID middleware
│   ├── routes/
│   │   └── health.ts       # Health endpoints
│   └── index.ts            # Main server entry point
├── Dockerfile
├── Dockerfile.dev
├── package.json
└── tsconfig.json
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://rook_app:changeme_app_password@localhost:5432/rook` |
| `GATEWAY_PORT` | HTTP server port | `35000` |
| `GATEWAY_HOST` | HTTP server host | `0.0.0.0` |
| `API_KEY_SECRET` | Secret for API key hashing | Required (min 32 chars) |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `RATE_LIMIT_MAX` | Max requests per window | `1000` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `60000` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_FORMAT` | Log format (json/pretty) | `json` |

## Development Status

### Phase 1: Core Infrastructure ✅
- [x] Project setup (Fastify + TypeScript)
- [x] Database connection and configuration
- [x] Basic health endpoints
- [x] Docker configuration

### Phase 2: Authentication (Next)
- [ ] Agent registration endpoint
- [ ] API key generation and hashing
- [ ] API key validation middleware
- [ ] Organization scoping

### Phase 3: Data Ingestion
- [ ] Device registration endpoint
- [ ] Telemetry ingestion endpoint
- [ ] Data validation (Zod schemas)
- [ ] Database write operations

## Testing

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Manual testing
curl http://localhost:35000/healthz
```

## Logs

Structured JSON logging is enabled by default. In development mode, logs are pretty-printed.

Example log output:
```json
{
  "level": 30,
  "time": 1234567890,
  "requestId": "abc-123",
  "method": "GET",
  "url": "/healthz",
  "statusCode": 200,
  "duration": 5
}
```

## Security Considerations

- API keys are hashed using bcrypt/scrypt
- Rate limiting per agent and organization
- Input validation on all endpoints
- TLS/HTTPS for production (configure at reverse proxy)

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network connectivity
- Review database logs

### Port Already in Use
- Change `GATEWAY_PORT` in environment
- Check for other services using port 35000

### Build Errors
- Ensure Node.js 20+ is installed
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Next Steps

See [API Gateway Plan](../../docs/api-gateway-plan.md) for the complete architecture and roadmap.


