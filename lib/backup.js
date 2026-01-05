const fs = require('fs')
const byteSize = require('byte-size')
const SqlLiteDatabase = require('better-sqlite3')
const { EDDATA_BACKUP_LOG } = require('../lib/consts')

const TEN_KB_IN_BYTES = 10000
const MIN_ROWS_EXPECTED = 100

/**
 * Write to backup log
 */
function writeBackupLog (text, reset = false) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${text}\n`

  if (reset) {
    fs.writeFileSync(EDDATA_BACKUP_LOG, logEntry)
  } else {
    fs.appendFileSync(EDDATA_BACKUP_LOG, logEntry)
  }
  console.log(text)
}

/**
 * Backup a SQLite database
 */
function backupDatabase (dbToBackup, pathToBackupTargetLocation) {
  return new Promise((resolve, reject) => {
    try {
      dbToBackup.backup(pathToBackupTargetLocation)
        .then(() => {
          writeBackupLog(`✓ Backup created: ${pathToBackupTargetLocation}`)
          resolve()
        })
        .catch(reject)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Verify backup integrity
 */
function verifyBackup (pathToBackupTargetLocation, tables, minDbSizeInBytes) {
  try {
    const stats = fs.statSync(pathToBackupTargetLocation)
    const fileSize = byteSize(stats.size)

    if (stats.size < TEN_KB_IN_BYTES) {
      throw new Error(`Backup file too small: ${fileSize.value}${fileSize.unit}`)
    }

    if (stats.size < minDbSizeInBytes) {
      throw new Error(`Backup smaller than expected: ${fileSize.value}${fileSize.unit}`)
    }

    const db = new SqlLiteDatabase(pathToBackupTargetLocation, { readonly: true })

    for (const table of tables) {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
      if (result.count < MIN_ROWS_EXPECTED) {
        throw new Error(`Table ${table} has too few rows: ${result.count}`)
      }
    }

    db.close()

    writeBackupLog(`✓ Backup verified: ${fileSize.value}${fileSize.unit}`)
    return true
  } catch (error) {
    writeBackupLog(`✗ Backup verification failed: ${error.message}`)
    throw error
  }
}

module.exports = {
  writeBackupLog,
  backupDatabase,
  verifyBackup
}
