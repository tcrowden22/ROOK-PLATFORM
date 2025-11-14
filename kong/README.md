# Kong Gateway Configuration

## Overview

Kong Gateway is configured as the single public entry point for the Rook Platform. All services are routed through Kong, which handles authentication, rate limiting, and observability.

## Services and Routes

### Services
- **api-service**: Routes to API service on port 3000
- **gateway-service**: Routes to Gateway service (Geri) on port 35000
- **frontend-service**: Routes to Frontend service on port 80

### Routes
- `/api/**` → api-service
- `/agents/**` → gateway-service
- `/` → frontend-service
- `/metrics` → Prometheus metrics (global plugin)

## Initial Setup

Kong requires two one-time setup steps:

1. **Database Migrations**: Run Kong database migrations
2. **Route Configuration**: Configure services and routes

These are handled by init containers that run automatically on first startup.

### Manual Setup (if needed)

If you need to re-run setup:

```bash
# Run migrations
docker compose --profile init up kong-migrations

# Configure routes (after Kong is running)
docker compose --profile init up kong-setup
```

## Configuration

Kong uses PostgreSQL database mode for configuration persistence. The configuration is stored in the `kong` database.

### Admin API

Kong Admin API is available internally on port 8001:
- Access from within the Docker network: `http://kong:8001`
- Not exposed publicly for security

### Plugins

- **Prometheus**: Global plugin for metrics collection
- **Key-Auth**: Plugin for `/agents/**` routes (API key authentication)
- **OIDC**: Disabled (requires separate installation or Kong Enterprise)

## Authentication

### User Authentication (API Routes)

Currently handled by API service directly (OIDC plugin not installed). Future: Kong OIDC plugin will handle authentication and inject headers.

### Agent Authentication (Gateway Routes)

- Kong validates API key via key-auth plugin
- Gateway service performs additional validation (defense-in-depth)

## Observability

### Metrics

Prometheus metrics available at: `http://localhost:8000/metrics`

### Logs

Kong logs to stdout/stderr:
- Access logs: stdout
- Error logs: stderr
- Structured JSON format (when configured)

## Troubleshooting

### Routes Not Working

Check if services and routes are configured:
```bash
docker compose exec kong kong config dump
```

### Re-run Setup

If routes need to be reconfigured:
```bash
docker compose --profile init up kong-setup
```

### Check Kong Status

```bash
docker compose exec kong kong health
```

### View Kong Logs

```bash
docker compose logs kong
```

## Notes

- Kong Admin API (8001) is internal-only
- Kong configuration is stored in PostgreSQL `kong` database
- Routes are persistent across restarts
- Init containers (`kong-migrations`, `kong-setup`) are hidden from normal operations (use `--profile init` to see them)

