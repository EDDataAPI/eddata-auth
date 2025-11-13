#!/usr/bin/env node

/**
 * Database Optimization Script
 * Optimizes the SQLite database for better performance
 */

const { authDb } = require('../lib/db')

;(async () => {
  console.time('Database optimization')
  console.log('Starting database optimization...')

  try {
    // Vacuum the database to reclaim space
    console.log('Running VACUUM...')
    authDb.prepare('VACUUM').run()

    // Analyze tables for better query planning
    console.log('Running ANALYZE...')
    authDb.prepare('ANALYZE').run()

    // Optimize database
    console.log('Running PRAGMA optimize...')
    authDb.pragma('optimize')

    console.log('✓ Database optimization complete')
    console.timeEnd('Database optimization')
    process.exit(0)
  } catch (error) {
    console.error('✗ Optimization failed:', error.message)
    process.exit(1)
  }
})()
