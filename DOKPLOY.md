# Dokploy Deployment Configuration

## Required Environment Variables

Configure these in your Dokploy project settings:

### Required Secrets
```bash
EDDATA_SESSION_SECRET=<generate-64-byte-random-hex>
EDDATA_AUTH_JWT_SECRET=<generate-64-byte-random-hex>
```

### Frontier OAuth
```bash
EDDATA_AUTH_CLIENT_ID=<your-frontier-client-id>
```

### Domain Configuration
```bash
EDDATA_DOMAIN=eddata-api.com
EDDATA_AUTH_BASE_URL=https://auth.eddata-api.com
EDDATA_WWW_BASE_URL=https://eddata-api.com
EDDATA_AUTH_COOKIE_DOMAIN=.eddata-api.com
```

### Optional
```bash
NODE_ENV=production
EDDATA_AUTH_LOCAL_PORT=3003
EDDATA_DATA_DIR=/app/eddata-data
```

## Generate Secrets

Run this command to generate secure random secrets:

```bash
node -e "console.log('EDDATA_SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('EDDATA_AUTH_JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

## Dokploy Deployment Steps

1. **Create Project in Dokploy**
   - Name: `eddata`
   - Type: Application

2. **Add Service**
   - Name: `auth`
   - Type: Docker Compose
   - Repository: `https://github.com/EDDataAPI/eddata-auth.git`
   - Branch: `main`

3. **Configure Environment Variables**
   - Add all required environment variables from above
   - Mark secrets as "secret" in Dokploy

4. **Configure Domain**
   - Domain: `auth.eddata-api.com`
   - SSL: Let's Encrypt (automatic via Traefik)

5. **Deploy**
   - Click "Deploy" button
   - Monitor logs for successful startup

## Health Check

The service provides a health endpoint at:
```
https://auth.eddata-api.com/health
```

Expected response:
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

## Traefik Labels

The docker-compose.yml includes Traefik labels for:
- Automatic SSL with Let's Encrypt
- Health checks
- Security headers (HSTS, SSL redirect)
- Load balancing

## Volumes

Persistent data is stored in Docker volumes:
- `eddata-data`: Main database and cache
- `eddata-backup`: Database backups

## Backup

Set up a Dokploy cron job for regular backups:
```bash
0 2 * * * docker exec eddata-auth npm run backup
```

## Monitoring

View logs in Dokploy dashboard or via CLI:
```bash
docker logs -f eddata-auth
```

## Troubleshooting

### Service not starting
Check environment variables are set correctly:
```bash
docker exec eddata-auth env | grep EDDATA
```

### Database issues
Check database file permissions:
```bash
docker exec eddata-auth ls -la /app/eddata-data/
```

### SSL certificate issues
Verify Traefik is configured and domain DNS points to server.
