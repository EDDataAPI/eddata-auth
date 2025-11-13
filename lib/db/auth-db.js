const path = require('path')
const SqlLiteDatabase = require('better-sqlite3')
const { ARDENT_AUTH_DB } = require('../consts')

let database = null

function getDatabase (options = {}) {
  if (!database) database = new SqlLiteDatabase(ARDENT_AUTH_DB, options)
  return database
}

function getDatabaseName () {
  return path.basename(ARDENT_AUTH_DB)
}

function ensureTables () {
  // The 'session' table maps Commander ID's which are returned by Frontier.
  // It stores a single Access Token and Refresh Token per player and
  // handles both updating / replace them when a user signs in from a
  // new device and rotating Access Tokens before they expire.
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      cmdrId TEXT PRIMARY KEY,
      accessToken TEXT,
      refreshToken TEXT,
      expiresAt TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)

  // The capi table caches responses from the Companion API so that we can
  // store and access the last known valid copies of that data
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS cache (
      cmdrId,
      key TEXT,
      value TEXT,
      updatedAt TEXT,
      PRIMARY KEY(cmdrId, key)
    )
  `)
}

function ensureIndexes () {
  // Only the cmdrId needs to be indexed in each table and it's already the primary key
}

module.exports = {
  getDatabase,
  getDatabaseName,
  ensureTables,
  ensureIndexes
}
