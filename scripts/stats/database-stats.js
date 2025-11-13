#!/usr/bin/env node

/**
 * Database Statistics Generator
 * Generates statistics about the auth database
 */

const fs = require('fs')
const { authDb } = require('../../lib/db')
const { EDDATA_DATABASE_STATS, EDDATA_CACHE_DIR } = require('../../lib/consts')

;(async () => {
  console.time('Update database stats')

  // Ensure cache directory exists
  if (!fs.existsSync(EDDATA_CACHE_DIR)) {
    fs.mkdirSync(EDDATA_CACHE_DIR, { recursive: true })
  }

  // Query session statistics
  const sessionCount = authDb.prepare('SELECT COUNT(*) as count FROM sessions').get()
  const activeSessions24h = authDb.prepare(`
    SELECT COUNT(*) as count FROM sessions 
    WHERE datetime(updatedAt) > datetime('now', '-24 hours')
  `).get()
  const totalSessions = sessionCount.count

  // Query cache statistics
  const cacheCount = authDb.prepare('SELECT COUNT(*) as count FROM cache').get()
  const cacheUpdated24h = authDb.prepare(`
    SELECT COUNT(*) as count FROM cache
    WHERE datetime(updatedAt) > datetime('now', '-24 hours')
  `).get()

  // Get unique commanders
  const uniqueCmdrs = authDb.prepare('SELECT COUNT(DISTINCT cmdrId) as count FROM sessions').get()

  // Generate statistics
  const stats = {
    sessions: {
      total: totalSessions,
      active24h: activeSessions24h.count,
      uniqueCommanders: uniqueCmdrs.count
    },
    cache: {
      total: cacheCount.count,
      updated24h: cacheUpdated24h.count
    },
    timestamp: new Date().toISOString(),
    version: require('../../package.json').version
  }

  fs.writeFileSync(EDDATA_DATABASE_STATS, JSON.stringify(stats, null, 2))
  
  console.log('Statistics generated:')
  console.log(`  Total sessions: ${stats.sessions.total}`)
  console.log(`  Active (24h): ${stats.sessions.active24h}`)
  console.log(`  Unique commanders: ${stats.sessions.uniqueCommanders}`)
  console.log(`  Cache entries: ${stats.cache.total}`)
  
  console.timeEnd('Update database stats')
  process.exit(0)
})()
