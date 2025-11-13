const AuthDatabase = require('./auth-db')

// A generous timeout of 5 seconds helps avoid any errors in the rare case there
// is a write lock held by another process - e.g. a maintenance/stats script
const WRITE_BUSY_TIMEOUT_IN_MS = 5000

const [
  authDb
] = [
  AuthDatabase
].map(database => {
  const databaseName = database.getDatabaseName()

  console.log(`[${databaseName}] Initializing database`)
  const db = database.getDatabase({
    // verbose: console.log
  })

  console.log(`[${databaseName}] Setting pragma options on database`)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma(`busy_timeout = ${WRITE_BUSY_TIMEOUT_IN_MS}`)

  console.log(`[${databaseName}] Ensuring tables exist and indexes present`)
  database.ensureTables()
  database.ensureIndexes()

  console.log(`[${databaseName}] Database initialized`)
  return db
})

const closeAllDatabaseConnections = () => {
  authDb.close()
}

module.exports = {
  authDb,
  closeAllDatabaseConnections
}
