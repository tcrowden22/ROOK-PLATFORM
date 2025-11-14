# Rook Unified Access Platform

A comprehensive enterprise identity and access management system with integrated modules for ITSM, MDM, asset management, and workflow automation.

## 🏗️ Architecture

Rook Platform is built as a modular monolith with multiple integrated services:

### Core Modules

- **Odin** - Single Sign-On (SSO) & Dashboard Portal
- **Muninn** - Identity & Access Management (IAM)
- **Sigurd** - IT Service Management (ITSM)
- **Huginn** - Mobile Device Management (MDM)
- **Skuld** - Asset Management & CMDB
- **Yggdrasil** - Workflow Automation Engine
- **Geri** - API Gateway for agent communications

### Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│              Port: 5173 (dev) / 34000 (prod)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              API Gateway (Geri)                         │
│              Port: 35000                                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Backend API (Fastify)                      │
│              Port: 8000 (dev) / 34100 (prod)            │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ Muninn   │ Sigurd   │ Huginn   │ Skuld    │         │
│  │ (IAM)    │ (ITSM)   │ (MDM)    │ (Assets) │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              PostgreSQL Database                         │
│              Port: 5432                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ muninn   │ sigurd   │ huginn   │ skuld    │         │
│  │ schema   │ schema   │ schema   │ schema   │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **TanStack Virtual** - Virtual scrolling for large lists

### Backend
- **Fastify** - High-performance web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM and migrations
- **PostgreSQL 16** - Primary database
- **Jose** - JWT handling
- **Zod** - Schema validation

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **PostgreSQL** - Database
- **Keycloak** (optional) - Identity provider integration
- **Kong** (optional) - API gateway

## 📋 Prerequisites

- **Node.js 20+** (recommended: use nvm)
- **PostgreSQL 16+** OR Docker
- **npm** or **yarn**
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tcrowden22/ROOK-PLATFORM.git
cd rook-platform
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd apps/api
npm install

# Install Gateway dependencies (optional)
cd ../gateway
npm install
```

### 3. Start Database

Using Docker (recommended):
```bash
docker-compose up -d postgres
# Wait ~10 seconds for PostgreSQL to initialize
```

Or use an existing PostgreSQL instance:
- Create database: `createdb rook`
- Run init scripts from `db/init/` directory

### 4. Configure Environment Variables

Create `.env` files:

**Root `.env`:**
```env
VITE_API_URL=http://localhost:8000
```

**`apps/api/.env`:**
```env
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/rook
API_PORT=8000
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

**`apps/gateway/.env` (optional):**
```env
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/rook
GATEWAY_PORT=35000
API_KEY_SECRET=your-secret-key-min-32-chars
```

### 5. Run Database Migrations

```bash
cd apps/api
npm run db:migrate
```

### 6. Seed Database (Optional)

Creates test users and sample data:
```bash
npm run db:seed
```

### 7. Start Services

**Terminal 1 - Backend API:**
```bash
cd apps/api
npm run dev
```
Backend will start on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd /path/to/rook-platform
npm run dev
```
Frontend will start on `http://localhost:5173`

**Terminal 3 - Gateway (optional):**
```bash
cd apps/gateway
npm run dev
```
Gateway will start on `http://localhost:35000`

### 8. Access the Application

Open your browser to: **http://localhost:5173**

### Default Test Users (after seeding)

- `admin@rook.local` - Admin role (full access)
- `agent@rook.local` - Agent role (ITSM operations)
- `user@rook.local` - User role (standard user)

In demo mode, login accepts any password for existing users.

## 📁 Project Structure

```
rook-platform/
├── apps/
│   ├── api/                 # Backend API service
│   │   ├── src/
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── lib/         # Utilities and helpers
│   │   │   │   └── db/
│   │   │   │       └── schemas/  # Database schemas
│   │   │   ├── middleware/  # Express/Fastify middleware
│   │   │   └── config/      # Configuration
│   │   ├── drizzle/         # Database migrations
│   │   └── scripts/         # Migration and seed scripts
│   ├── gateway/             # API Gateway (Geri)
│   │   └── src/             # Gateway service code
│   ├── frontend/            # Frontend app (if separate)
│   └── keycloak/            # Keycloak configuration
├── src/                     # Frontend source code
│   ├── components/          # React components
│   │   ├── ui/              # Reusable UI components
│   │   ├── muninn/          # IAM components
│   │   ├── sigurd/          # ITSM components
│   │   ├── huginn/          # MDM components
│   │   └── skuld/           # Asset management components
│   ├── pages/               # Page components
│   ├── lib/                 # Utilities and API clients
│   ├── contexts/            # React contexts
│   └── sdk/                 # API SDK clients
├── db/
│   └── init/                # Database initialization scripts
├── kong/                    # Kong API Gateway config
├── scripts/                 # Deployment and utility scripts
├── docker-compose.yml       # Docker Compose configuration
└── package.json             # Root package.json
```

## 🗄️ Database Schema

The platform uses PostgreSQL with multiple schemas for module isolation:

- **`muninn`** - Identity & Access Management
  - Users, groups, roles, policies, audit logs
- **`sigurd`** - IT Service Management
  - Incidents, service requests, problems, changes, knowledge base
- **`huginn`** - Mobile Device Management
  - Devices, policies, compliance, enrollment
- **`skuld`** - Asset Management
  - Assets, models, vendors, locations, assignments
- **`yggdrasil`** - Workflow Automation
  - Workflows, triggers, integrations, execution logs
- **`gateway`** - API Gateway
  - Registration codes, agent authentication

All tables include `organization_id` for multi-tenant isolation.

## 🔧 Development

### Running in Development Mode

All services support hot-reload:

```bash
# Backend API (auto-reloads on file changes)
cd apps/api
npm run dev

# Frontend (Vite HMR)
npm run dev

# Gateway
cd apps/gateway
npm run dev
```

### Database Migrations

```bash
cd apps/api

# Generate migration from schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
```

### Testing

```bash
# Run tests (when implemented)
npm test
```

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Production Build

```bash
# Build frontend
npm run build

# Build API
cd apps/api
npm run build

# Build Gateway
cd apps/gateway
npm run build
```

## 🔐 Authentication & Security

### Authentication Methods

1. **Custom DB Auth** (Default)
   - Uses `auth_users` and `auth_sessions` tables
   - JWT tokens stored in localStorage and cookies
   - Password hashing with scrypt

2. **Keycloak Integration** (Optional)
   - Set `KEYCLOAK_URL` environment variable
   - OIDC/OAuth2 authentication
   - Single Sign-On (SSO) support

### Role-Based Access Control (RBAC)

- **admin** - Full system access
- **agent** - ITSM operations, user management
- **user** - Standard user access

All access is scoped by `organization_id` for multi-tenant isolation.

## 📚 Module Documentation

### Muninn (IAM)
- User and group management
- Role-based access control
- Application SSO configuration
- Policy management
- Audit logging

### Sigurd (ITSM)
- Incident management
- Service request fulfillment
- Problem management
- Change management
- Knowledge base

### Huginn (MDM)
- Device enrollment
- Policy compliance
- App deployment
- Security posture monitoring

### Skuld (Asset Management)
- Asset lifecycle management
- Vendor and model management
- Location tracking
- Assignment tracking
- Import/export functionality

### Yggdrasil (Workflows)
- Workflow automation
- Trigger configuration
- Integration management
- Execution logs

## 🚨 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `docker ps` or `pg_isready`
- Verify `DATABASE_URL` in `apps/api/.env`
- Check port 8000 is not in use

### Frontend can't connect to backend
- Verify `VITE_API_URL` in root `.env` is `http://localhost:8000`
- Check backend is running on port 8000
- Check `CORS_ORIGIN` in `apps/api/.env` includes `http://localhost:5173`

### Database connection errors
- Ensure PostgreSQL is running
- Check connection string in `apps/api/.env`
- Verify database `rook` exists
- Run migrations: `npm run db:migrate`

### Port conflicts
- Change ports in `.env` files
- Check for other services using the same ports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

[Add your license here]

## 🔗 Links

- **GitHub Repository**: https://github.com/tcrowden22/ROOK-PLATFORM
- **Documentation**: [Add documentation link]
- **Issue Tracker**: [Add issues link]

## 📞 Support

For support, please open an issue on GitHub or contact [your contact information].

---

Built with ❤️ using React, Fastify, and PostgreSQL

