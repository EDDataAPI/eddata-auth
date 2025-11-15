const path = require('path')
const fs = require('fs')
const { randomBytes } = require('crypto')

// Valid config file locations
const EDDATA_CONFIG_LOCATIONS = [
  '/etc/eddata.config',
  path.join(__dirname, '../../eddata.config'),
  path.join(__dirname, '../eddata.config')
]

for (const configPath of EDDATA_CONFIG_LOCATIONS.reverse()) {
  if (fs.existsSync(configPath)) require('dotenv').config({ path: configPath })
}

// Note: EDDATA_DOMAIN is not used when EDDATA_AUTH_BASE_URL or
// EDDATA_WWW_BASE_URL are explicitly set (e.g. to localhost URLs).
const EDDATA_DOMAIN = process.env?.EDDATA_DOMAIN ?? 'eddata.dev'

const EDDATA_AUTH_BASE_URL = process.env?.EDDATA_AUTH_BASE_URL ?? `https://auth.${EDDATA_DOMAIN}`
const EDDATA_WWW_BASE_URL = process.env?.EDDATA_WWW_BASE_URL ?? `https://${EDDATA_DOMAIN}`
const EDDATA_AUTH_LOCAL_PORT = Number(process.env?.EDDATA_AUTH_LOCAL_PORT ?? 3003)

// Data directory configuration
const defaultDataDir = path.join(__dirname, '../../eddata-data')
const EDDATA_DATA_DIR = process.env?.EDDATA_DATA_DIR ?? defaultDataDir
const EDDATA_CACHE_DIR = process.env?.EDDATA_CACHE_DIR ?? path.join(EDDATA_DATA_DIR, 'cache')
const EDDATA_BACKUP_DIR = process.env?.EDDATA_BACKUP_DIR ?? path.join(EDDATA_DATA_DIR, 'backup')

// Database paths
const EDDATA_AUTH_DB = path.join(EDDATA_DATA_DIR, 'auth.db')
const EDDATA_BACKUP_LOG = path.join(EDDATA_BACKUP_DIR, 'backup.log')
const EDDATA_DATABASE_STATS = path.join(EDDATA_CACHE_DIR, 'database-stats.json')

// Session and JWT secrets
if (!process.env?.EDDATA_SESSION_SECRET) {
  console.warn('WARNING: EDDATA_SESSION_SECRET was not set, generating temporary secret (will change when server restarts)')
  process.env.EDDATA_SESSION_SECRET = randomBytes(64).toString('hex')
}
const SESSION_SECRET = process.env.EDDATA_SESSION_SECRET

if (!process.env?.EDDATA_AUTH_JWT_SECRET) {
  console.warn('WARNING: EDDATA_AUTH_JWT_SECRET was not set, generating temporary secret (will change when server restarts)')
  process.env.EDDATA_AUTH_JWT_SECRET = randomBytes(64).toString('hex')
}

const AUTH_JWT_SECRET = process.env.EDDATA_AUTH_JWT_SECRET
const AUTH_CLIENT_ID = process.env?.EDDATA_AUTH_CLIENT_ID ?? '54fe2942-7b30-492a-801a-0a95e72c6b13'
const AUTH_COOKIE_DOMAIN = process.env?.EDDATA_AUTH_COOKIE_DOMAIN ?? '.eddata.dev'
const AUTH_CALLBACK_URL = `${EDDATA_AUTH_BASE_URL}/callback`
const AUTH_SIGNED_IN_URL = `${EDDATA_WWW_BASE_URL}/auth/signed-in`
const AUTH_SIGNED_OUT_URL = `${EDDATA_WWW_BASE_URL}/auth/signed-out`
const AUTH_ERROR_URL = `${EDDATA_WWW_BASE_URL}/auth/error`

const FRONTIER_API_BASE_URL = 'https://companion.orerve.net'

const MAX_JWT_AGE_SECONDS = 60 * 60 * 24 * 30 // JWT valid for up to 30 days if no activity
const COOKIE_DEFAULT_OPTIONS = { httpOnly: true, domain: AUTH_COOKIE_DOMAIN, signed: true }
const JWT_COOKIE_OPTIONS = { ...COOKIE_DEFAULT_OPTIONS, maxAge: MAX_JWT_AGE_SECONDS * 1000 }

module.exports = {
  EDDATA_AUTH_LOCAL_PORT,
  EDDATA_DATA_DIR,
  EDDATA_CACHE_DIR,
  EDDATA_BACKUP_DIR,
  EDDATA_AUTH_DB,
  EDDATA_BACKUP_LOG,
  EDDATA_DATABASE_STATS,
  SESSION_SECRET,
  AUTH_JWT_SECRET,
  AUTH_CLIENT_ID,
  AUTH_CALLBACK_URL,
  AUTH_COOKIE_DOMAIN,
  AUTH_SIGNED_IN_URL,
  AUTH_SIGNED_OUT_URL,
  AUTH_ERROR_URL,
  MAX_JWT_AGE_SECONDS,
  JWT_COOKIE_OPTIONS,
  COOKIE_DEFAULT_OPTIONS,
  FRONTIER_API_BASE_URL,
  EDDATA_AUTH_BASE_URL,
  EDDATA_WWW_BASE_URL
}
