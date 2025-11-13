#!/usr/bin/env node

/**
 * Ardent Auth Database Backup Script
 * Creates verified backups of the authentication database
 */

const path = require('path')
const fs = require('fs')
const { authDb } = require('../lib/db')
const { backupDatabase, verifyBackup, writeBackupLog } = require('../lib/backup')
const {
  ARDENT_AUTH_DB,
  ARDENT_BACKUP_DIR,
  ARDENT_DATA_DIR
} = require('../lib/consts')

;(async () => {
  console.time('Backup complete')
  
  writeBackupLog('Starting backup process', true)

  // Ensure backup directory exists
  if (!fs.existsSync(ARDENT_BACKUP_DIR)) {
    fs.mkdirSync(ARDENT_BACKUP_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const backupPath = path.join(ARDENT_BACKUP_DIR, `auth-${timestamp}.db`)

  try {
    // Create backup
    writeBackupLog('Creating database backup...')
    await backupDatabase(authDb, backupPath)

    // Verify backup
    writeBackupLog('Verifying backup integrity...')
    const minSize = fs.statSync(ARDENT_AUTH_DB).size * 0.9 // At least 90% of original
    verifyBackup(backupPath, ['sessions', 'cache'], minSize)

    // Create a "latest" symlink/copy for easy access
    const latestPath = path.join(ARDENT_BACKUP_DIR, 'auth-latest.db')
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath)
    }
    fs.copyFileSync(backupPath, latestPath)

    // Generate backup report
    const backupReport = {
      timestamp: new Date().toISOString(),
      backupFile: path.basename(backupPath),
      originalSize: fs.statSync(ARDENT_AUTH_DB).size,
      backupSize: fs.statSync(backupPath).size,
      success: true
    }

    fs.writeFileSync(
      path.join(ARDENT_BACKUP_DIR, 'backup.json'),
      JSON.stringify(backupReport, null, 2)
    )

    writeBackupLog('✓ Backup completed successfully')
    console.timeEnd('Backup complete')
    process.exit(0)
  } catch (error) {
    writeBackupLog(`✗ Backup failed: ${error.message}`)
    console.error(error)
    process.exit(1)
  }
})()
