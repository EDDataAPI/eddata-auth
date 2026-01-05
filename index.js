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

console.log(`EDData Authentication v${Package.version} starting`)

// Initialize default value for env vars before other imports
console.log('Configuring environment …')
const {
  EDDATA_AUTH_LOCAL_PORT,
  EDDATA_DATA_DIR,
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
if (!fs.existsSync(EDDATA_DATA_DIR)) {
  try {
    fs.mkdirSync(EDDATA_DATA_DIR, { recursive: true })
    console.log(`Created directory: ${EDDATA_DATA_DIR}`)
  } catch (error) {
    console.error(`Failed to create directory ${EDDATA_DATA_DIR}:`, error.message)
  }
}

console.log('Loading libraries …')
const router = require('./router')
const cronTasks = require('./lib/cron-tasks')

;(async () => {
  // Start web service
  console.log('Starting EDData Authentication service')
  const app = new Koa()
  app.use(koaBodyParser())
  app.keys = new KeyGrip([SESSION_SECRET], 'sha256') // Used to sign cookies
  app.proxy = true // Proxy headers should be passed through

  // Set default headers
  app.use(async (ctx, next) => {
    ctx.set('EDData-Auth-Version', `${Package.version}`)

    // Requests made to the Authentication service should never be cached
    ctx.set('Cache-Control', 'private')

    // Headers required to support requests with credentials (i.e. auth tokens)
    // while still supporting API requests from any domain
    const origin = ctx.request.header.origin || ctx.request.header.referer || '*'
    ctx.set('Access-Control-Allow-Origin', origin)
    ctx.set('Access-Control-Allow-Credentials', true)
    ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    // Handle OPTIONS preflight requests
    if (ctx.method === 'OPTIONS') {
      ctx.status = 204
      return
    }

    if (process.env.NODE_ENV !== 'development') {
      // Enable secure cookies when behind HTTP proxy in production
      ctx.cookies.secure = true
    }
    await next()
  })

  // Add route handlers
  router.get('/', (ctx) => {
    const uptime = Math.round((performance.now() - startTime) / 1000)
    const memoryInfo = getMemoryInfo()
    ctx.body = `EDData Authentication v${Package.version}\n` +
      `Uptime: ${uptime}s\n` +
      `Memory: ${memoryInfo.heapUsed}MB / ${memoryInfo.heapTotal}MB\n` +
      `Node.js: ${process.version}`
  })

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

  app.use(router.routes()).use(router.allowedMethods())

  // Every 15 minutes check for any tokens that expire "soon" and preemptively refresh them
  // (and also at startup, in case there has been any downtime).
  cronTasks.rotateAccessTokens()
  cron.schedule('0 */15 * * * *', () => {
    cronTasks.rotateAccessTokens()
  })

  app.listen(EDDATA_AUTH_LOCAL_PORT)

  performanceMark('app-ready')
  console.log('EDData Authentication service started!')
  console.log(`Listening on port ${EDDATA_AUTH_LOCAL_PORT}`)
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
