# EDData Authentication Service - Node.js 24 Edition

![Node.js](https://img.shields.io/badge/node-%3E%3D24.11.0-brightgreen)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue)

Authentication service for EDData - providing secure OAuth integration with Frontier Developments' Elite Dangerous API.

**Production Domain:** `https://auth.eddata.dev`

## 🚀 What's New in v3.0

- **Node.js 24.11.0+** - Upgraded to latest LTS with performance improvements
- **Modern Architecture** - Restructured following eddata-collector patterns
- **Docker Support** - Multi-stage builds and Docker Compose configuration
- **Enhanced Tooling** - Backup, stats, optimize, and deployment scripts
- **Performance Tracking** - Built-in performance metrics and health checks
- **Better Security** - Non-root container user, proper secret handling

## 📋 System Requirements

- **Node.js v24.11.0 or higher** (recommended: v24.x LTS)
- **Docker** and **Docker Compose** (for container deployment)
- **SQLite3** (bundled with better-sqlite3)

## 🛠️ Installation

### Quick Start with Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/EDDataAPI/eddata-auth.git
cd eddata-auth

# Configure environment
cp .env.example eddata.config
# Edit eddata.config with your settings

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3003/health
```

### Manual Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example eddata.config
# Edit eddata.config with your settings

# Start in development
npm run dev

# Start in production
npm start
```

## 🔧 Configuration

### Environment Variables

Create an `eddata.config` file in the project root:

```bash
# Domain configuration
EDDATA_DOMAIN=your-domain.com
EDDATA_AUTH_BASE_URL=https://auth.your-domain.com
EDDATA_WWW_BASE_URL=https://your-domain.com

# Security (REQUIRED - generate strong secrets!)
EDDATA_SESSION_SECRET=your-long-random-session-secret
EDDATA_AUTH_JWT_SECRET=your-long-random-jwt-secret

# Frontier OAuth
EDDATA_AUTH_CLIENT_ID=your-frontier-client-id

# Cookie configuration
EDDATA_AUTH_COOKIE_DOMAIN=.your-domain.com

# Server
EDDATA_AUTH_LOCAL_PORT=3003
NODE_ENV=production
```

### Generate Secrets

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📚 API Endpoints

### Health & Status
- `GET /` - Service info with uptime and memory stats
- `GET /health` - Health check endpoint (for load balancers)
- `GET /auth/version` - Version information

### Authentication
- `GET /auth/signin` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/signout` - Sign out user

### Commander API (Requires Authentication)
- `GET /auth/cmdr` - List available CAPI endpoints
- `GET /auth/cmdr/profile` - Commander profile
- `GET /auth/cmdr/market` - Market data
- `GET /auth/cmdr/shipyard` - Shipyard data
- `GET /auth/cmdr/fleetcarrier` - Fleet carrier data
- `POST /auth/cmdr/delete` - Delete cached data

## 🔨 Development Scripts

```bash
# Development with hot reload
npm run dev

# Local development (custom URLs)
npm run dev:local

# Linting
npm run lint

# Database maintenance
npm run backup      # Create database backup
npm run stats       # Generate statistics
npm run optimize    # Optimize database

# Docker operations
npm run docker:build   # Build Docker image
npm run docker:run     # Start with Docker Compose
npm run docker:logs    # View logs
npm run docker:stop    # Stop containers

# Deployment
npm run deploy         # Deploy to production
```

## 🗄️ Database Structure

### Sessions Table
Stores OAuth tokens and refresh tokens per commander.

```sql
CREATE TABLE sessions (
  cmdrId TEXT PRIMARY KEY,
  accessToken TEXT,
  refreshToken TEXT,
  expiresAt TEXT,
  createdAt TEXT,
  updatedAt TEXT
)
```

### Cache Table
Caches Frontier API responses to reduce API load.

```sql
CREATE TABLE cache (
  cmdrId TEXT,
  key TEXT,
  value TEXT,
  updatedAt TEXT,
  PRIMARY KEY(cmdrId, key)
)
```

## 🔐 Security Features

- **PKCE OAuth Flow** - Secure authorization code flow
- **JWT Authentication** - Signed and encrypted tokens
- **Automatic Token Rotation** - Tokens refreshed every 15 minutes
- **Secure Cookies** - HttpOnly, signed cookies
- **Non-Root Container** - Docker runs as unprivileged user
- **CORS Protection** - Configurable origin restrictions

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3003/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T10:00:00.000Z",
  "version": "3.0.0",
  "uptime": 3600,
  "memory": {
    "heapUsed": 45,
    "heapTotal": 64,
    "rss": 78
  }
}
```

### Database Statistics

```bash
npm run stats
cat eddata-data/cache/database-stats.json
```

## 🐳 Docker Deployment

### Standard Docker Deployment

```bash
# Build image
docker build -t eddata-auth:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f eddata-auth

# Stop
docker-compose down
```

### Production Deployment Script

```bash
node scripts/deploy.js deploy --env=production
```

## 🔄 Automated Maintenance

### Token Rotation
Tokens are automatically refreshed every 15 minutes via cron job.

### Backup Schedule
Set up a cron job for regular backups:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/eddata-auth && npm run backup
```

## 🤝 Related Projects

- [eddata-www](https://github.com/EDDataAPI/eddata-www) - Web interface
- [eddata-api](https://github.com/EDDataAPI/eddata-api) - REST API
- [eddata-collector](https://github.com/EDDataAPI/eddata-collector) - Data collection service

## 📄 License

Copyright EDDataAPI, 2025.

This software has been released under the **GNU Affero General Public License v3.0**.

Elite Dangerous is copyright Frontier Developments plc. This software is not endorsed by nor reflects the views or opinions of Frontier Developments and no employee of Frontier Developments was involved in the making of it.

## 🙏 Acknowledgments

Based on the Ardent Insight project by Iain Collins.
Modernized and rebranded as EDData for Node.js 24 with patterns from eddata-collector.

## 📞 Support

- Issues: [GitHub Issues](https://github.com/EDDataAPI/eddata-auth/issues)
- Discussions: [GitHub Discussions](https://github.com/EDDataAPI/eddata-auth/discussions)