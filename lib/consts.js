const path = require('path')
const fs = require('fs')
const { randomBytes } = require('crypto')

// Valid config file locations
const ARDENT_CONFIG_LOCATIONS = [
  '/etc/ardent.config',
  path.join(__dirname, '../../ardent.config'),
  path.join(__dirname, '../ardent.config')
]

for (const path of ARDENT_CONFIG_LOCATIONS.reverse()) {
  if (fs.existsSync(path)) require('dotenv').config({ path })
}

// Note: ARDENT_DOMAIN is not used when ARDENT_AUTH_BASE_URL or
// ARDENT_WWW_BASE_URL are explicitly set (e.g. to localhost URLs).
const ARDENT_DOMAIN = process.env?.ARDENT_DOMAIN ?? 'ardent-insight.com'

const ARDENT_AUTH_BASE_URL = process.env?.ARDENT_AUTH_BASE_URL ?? `https://auth.${ARDENT_DOMAIN}`
const ARDENT_WWW_BASE_URL = process.env?.ARDENT_WWW_BASE_URL ?? `https://${ARDENT_DOMAIN}`
const ARDENT_AUTH_LOCAL_PORT = 3003
const ARDENT_DATA_DIR = process.env?.ARDENT_DATA_DIR ?? path.join(__dirname, '../../ardent-data')
const ARDENT_AUTH_DB = path.join(ARDENT_DATA_DIR, '/auth.db')

if (!process.env?.ARDENT_SESSION_SECRET) {
  console.warn('WARNING: ARDENT_SESSION_SECRET was not set, generating temporary secret (will change when server restarts)')
  process.env.ARDENT_SESSION_SECRET = randomBytes(64).toString('hex')
}
const SESSION_SECRET = process.env.ARDENT_SESSION_SECRET

if (!process.env?.ARDENT_AUTH_JWT_SECRET) {
  console.warn('WARNING: AUTH_JWT_SECRET was not set, generating temporary secret (will change when server restarts)')
  process.env.ARDENT_AUTH_JWT_SECRET = randomBytes(64).toString('hex')
}

const AUTH_JWT_SECRET = process.env.ARDENT_AUTH_JWT_SECRET
const AUTH_CLIENT_ID = process.env?.ARDENT_AUTH_CLIENT_ID ?? '54fe2942-7b30-492a-801a-0a95e72c6b13'
const AUTH_COOKIE_DOMAIN = process.env?.ARDENT_AUTH_COOKIE_DOMAIN ?? '.ardent-insight.com'
const AUTH_CALLBACK_URL = `${ARDENT_AUTH_BASE_URL}/callback`
const AUTH_SIGNED_IN_URL = `${ARDENT_WWW_BASE_URL}/auth/signed-in`
const AUTH_SIGNED_OUT_URL = `${ARDENT_WWW_BASE_URL}/auth/signed-out`
const AUTH_ERROR_URL = `${ARDENT_WWW_BASE_URL}/auth/error`

const FRONTIER_API_BASE_URL = 'https://companion.orerve.net'

const MAX_JWT_AGE_SECONDS = 60 * 60 * 24 * 30 // JWT valid for up to 30 days if no activity
const COOKIE_DEFAULT_OPTIONS = { httpOnly: true, domain: AUTH_COOKIE_DOMAIN, signed: true }
const JWT_COOKIE_OPTIONS = { ...COOKIE_DEFAULT_OPTIONS, maxAge: MAX_JWT_AGE_SECONDS * 1000 }

module.exports = {
  ARDENT_AUTH_LOCAL_PORT,
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
  ARDENT_AUTH_DB
}
