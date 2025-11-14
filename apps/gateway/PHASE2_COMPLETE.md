# Phase 2: Authentication - Complete ✅

## Summary

Phase 2 of the API Gateway implementation has been successfully completed. The gateway now supports agent authentication via API keys.

## What Was Completed

### ✅ Database Schema
- Created `gateway` schema in database
- Created `gateway.agents` table with:
  - `agent_id` (unique identifier)
  - `api_key_hash` (hashed API keys using scrypt)
  - `owner_user_id` (links to muninn.users)
  - `device_id` (links to huginn.devices)
  - `status` (active/inactive/revoked)
  - `metadata` (JSONB for additional data)
- Created `gateway.telemetry_submissions` audit table
- Added indexes for performance
- Updated database initialization script to include gateway schema

### ✅ API Key Management
- **API Key Generation**: Secure random key generation (`gk_` prefix)
- **API Key Hashing**: Scrypt-based hashing with salt
- **API Key Verification**: Constant-time comparison for security
- **Key Extraction**: Support for both `X-API-Key` header and `Authorization: Bearer` format

### ✅ Agent Registration
- **POST /v1/agents/register** endpoint
  - Validates agent_id uniqueness
  - Validates owner_user_id and device_id if provided
  - Generates and hashes API key
  - Returns API key (shown only once at registration)
  - Stores agent metadata

### ✅ Authentication Middleware
- **agentAuthMiddleware**: Validates API keys on protected routes
- Extracts API key from headers
- Verifies key against stored hash
- Checks agent status (active/inactive/revoked)
- Updates `last_seen_at` timestamp
- Attaches agent context to request

### ✅ Agent Endpoints
- **GET /v1/agents/me** - Get current agent info (requires auth)
- **PUT /v1/agents/me** - Update agent info (requires auth)
- **POST /v1/agents/heartbeat** - Send heartbeat (requires auth)

### ✅ Organization Scoping
- Agents can be linked to users via `owner_user_id`
- Device ownership validation
- Organization-based access control ready (can be extended)

## Files Created/Modified

### New Files
```
apps/gateway/
├── drizzle/migrations/
│   └── 0001_create_gateway_schema.sql  ✅ Gateway schema migration
├── src/
│   ├── lib/auth/
│   │   └── api-keys.ts                 ✅ API key utilities
│   ├── middleware/
│   │   └── auth.ts                     ✅ Agent authentication middleware
│   └── routes/
│       └── agents.ts                   ✅ Agent management endpoints
└── scripts/
    └── migrate.ts                      ✅ Migration script
```

### Modified Files
```
apps/gateway/
├── src/index.ts                        ✅ Registered agent routes
├── package.json                        ✅ Added db:migrate script
└── db/init/001_init.sql                ✅ Added gateway schema support
```

## API Endpoints

### Agent Registration (Public)
```http
POST /v1/agents/register
Content-Type: application/json

{
  "agent_id": "hostname-mac-address",
  "owner_user_id": "uuid-optional",
  "device_id": "uuid-optional",
  "metadata": {
    "hostname": "workstation-01",
    "os": "Windows 11"
  }
}

Response:
{
  "agent": {
    "id": "uuid",
    "agent_id": "hostname-mac-address",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "api_key": "gk_...",
  "message": "Store this API key securely..."
}
```

### Get Agent Info (Authenticated)
```http
GET /v1/agents/me
X-API-Key: gk_...

Response:
{
  "agent": {
    "id": "uuid",
    "agent_id": "...",
    "owner_user_id": "uuid",
    "device_id": "uuid",
    "status": "active",
    "metadata": {},
    "last_seen_at": "2024-01-01T00:00:00Z"
  }
}
```

### Update Agent (Authenticated)
```http
PUT /v1/agents/me
X-API-Key: gk_...
Content-Type: application/json

{
  "device_id": "uuid-optional",
  "metadata": {}
}

Response:
{
  "agent": { ... }
}
```

### Heartbeat (Authenticated)
```http
POST /v1/agents/heartbeat
X-API-Key: gk_...

Response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Security Features

- ✅ **Secure API Key Generation**: 32-byte random keys with `gk_` prefix
- ✅ **Scrypt Hashing**: Industry-standard password hashing
- ✅ **Constant-time Comparison**: Prevents timing attacks
- ✅ **Status Checks**: Only active agents can authenticate
- ✅ **Rate Limiting**: Global rate limiting (1000 req/min default)
- ✅ **Input Validation**: Zod schema validation
- ✅ **Error Handling**: Comprehensive error responses

## Database Schema

```sql
-- Agents table
CREATE TABLE gateway.agents (
  id uuid PRIMARY KEY,
  agent_id text UNIQUE NOT NULL,
  owner_user_id uuid REFERENCES muninn.users(id),
  api_key_hash text NOT NULL,
  device_id uuid REFERENCES huginn.devices(id),
  last_seen_at timestamptz,
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Telemetry submissions audit
CREATE TABLE gateway.telemetry_submissions (
  id uuid PRIMARY KEY,
  agent_id uuid REFERENCES gateway.agents(id),
  device_id uuid REFERENCES huginn.devices(id),
  record_count integer,
  status text,
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

## Testing

### Test Agent Registration
```bash
# Register a new agent
curl -X POST http://localhost:35000/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent-001",
    "metadata": {
      "hostname": "test-host",
      "os": "Windows"
    }
  }'

# Save the API key from response
API_KEY="gk_..."

# Get agent info
curl http://localhost:35000/v1/agents/me \
  -H "X-API-Key: $API_KEY"

# Send heartbeat
curl -X POST http://localhost:35000/v1/agents/heartbeat \
  -H "X-API-Key: $API_KEY"
```

## Next Steps: Phase 3

Phase 3 will implement data ingestion:

1. **Device Registration**
   - Create device during agent registration
   - Link device to agent
   - Update device information

2. **Telemetry Ingestion**
   - `POST /v1/telemetry` endpoint
   - `POST /v1/telemetry/batch` for bulk submissions
   - Data validation and transformation
   - Direct database writes

3. **Data Validation**
   - Zod schemas for telemetry data
   - CPU, memory, disk validation
   - Timestamp validation

4. **Error Handling**
   - Retry logic for failed submissions
   - Audit logging for all submissions
   - Error reporting to agents

---

**Status**: Phase 2 Complete ✅  
**Ready for**: Phase 3 - Data Ingestion  
**Branch**: `feature/api-gateway`





