const Package = require('./package.json')

// Prepend timestamp (HH:MM:SS) to all console output for better logging
const _origConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
}
const _ts = () => new Date().toTimeString().substr(0, 8)
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  console[level] = (...args) => {
    const prefix = `[${_ts()}]`
    if (args.length > 0 && typeof args[0] === 'string') {
      args[0] = `${prefix} ${args[0]}`
      _origConsole[level](...args)
    } else {
      _origConsole[level](prefix, ...args)
    }
  }
}

console.log(`Ardent Authentication v${Package.version} starting`)

// Initialize default value for env vars before other imports
console.log('Configuring environment …')
const {
  ARDENT_AUTH_LOCAL_PORT,
  ARDENT_DATA_DIR,
  SESSION_SECRET
} = require('./lib/consts')

console.log('Loading dependencies …')
const process = require('process')
const fs = require('fs')
const Koa = require('koa')
const koaBodyParser = require('koa-bodyparser')
const KeyGrip = require('keygrip')
const cron = require('node-cron')

// Node.js 24 Performance API
const startTime = performance.now()

// Helper functions for Node.js 24 performance tracking
function performanceMark (name) {
  try {
    performance.mark(name)
  } catch (e) {
    // Silently fail if performance API not available
  }
}

function getMemoryInfo () {
  const usage = process.memoryUsage()
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024)
  }
}

performanceMark('app-start')

console.log('Ensuring required directories exist …')
if (!fs.existsSync(ARDENT_DATA_DIR)) {
  try {
    fs.mkdirSync(ARDENT_DATA_DIR, { recursive: true })
    console.log(`Created directory: ${ARDENT_DATA_DIR}`)
  } catch (error) {
    console.error(`Failed to create directory ${ARDENT_DATA_DIR}:`, error.message)
  }
}

console.log('Loading libraries …')
const router = require('./router')
const cronTasks = require('./lib/cron-tasks')

;(async () => {
  // Start web service
  console.log('Starting Ardent Authentication service')
  const app = new Koa()
  app.use(koaBodyParser())
  app.keys = new KeyGrip([SESSION_SECRET], 'sha256') // Used to sign cookies
  app.proxy = true // Proxy headers should be passed through

  // Set default headers
  app.use((ctx, next) => {
    ctx.set('Ardent-Auth-Version', `${Package.version}`)

    // Requests made to the Authentication service should never be cached
    ctx.set('Cache-Control', 'private')

    // Headers required to support requests with credentials (i.e. auth tokens)
    // while still supporting API requests from any domain
    ctx.set('Access-Control-Allow-Origin', ctx.request.header.origin)
    ctx.set('Access-Control-Allow-Credentials', true)
    ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    if (process.env.NODE_ENV !== 'development') {
      // Enable secure cookies when behind HTTP proxy in production
      ctx.cookies.secure = true
    }
    return next()
  })

  // Add route handlers
  router.get('/', (ctx) => {
    const uptime = Math.round((performance.now() - startTime) / 1000)
    const memoryInfo = getMemoryInfo()
    ctx.body = `Ardent Authentication v${Package.version}\n` +
      `Uptime: ${uptime}s\n` +
      `Memory: ${memoryInfo.heapUsed}MB / ${memoryInfo.heapTotal}MB\n` +
      `Node.js: ${process.version}`
  })
  router.get('/auth', (ctx) => { ctx.body = `Ardent Authentication v${Package.version}` })
  router.get('/auth/version', (ctx) => { ctx.body = { version: Package.version, node: process.version } })
  
  // Health check endpoint for load balancers (Node.js 24 optimized)
  router.get('/health', (ctx) => {
    ctx.body = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: Package.version,
      uptime: Math.round((performance.now() - startTime) / 1000),
      memory: getMemoryInfo()
    }
  })

  app.use(router.routes())

  // Every 15 minutes check for any tokens that expire "soon" and preemptively refresh them
  // (and also at startup, in case there has been any downtime).
  cronTasks.rotateAccessTokens()
  cron.schedule('0 */15 * * * *', () => {
    cronTasks.rotateAccessTokens()
  })

  app.listen(ARDENT_AUTH_LOCAL_PORT)
  
  performanceMark('app-ready')
  console.log('Ardent Authentication service started!')
  console.log(`Listening on port ${ARDENT_AUTH_LOCAL_PORT}`)
  console.log(`Startup time: ${Math.round(performance.now() - startTime)}ms`)
})()

process.on('exit', () => console.log('Shutting down'))

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})
