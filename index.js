const Package = require('./package.json')
console.log(`Ardent Authentication v${Package.version} starting`)

// Initalise default value for env vars before other imports
console.log('Configuring environment …')
const {
  ARDENT_AUTH_LOCAL_PORT,
  SESSION_SECRET
} = require('./lib/consts')

console.log('Loading dependancies …')
const process = require('process')
const Koa = require('koa')
const koaBodyParser = require('koa-bodyparser')
const KeyGrip = require('keygrip')
const cron = require('node-cron')

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
  router.get('/', (ctx) => { ctx.body = `Ardent Authentication v${Package.version}` })
  router.get('/auth', (ctx) => { ctx.body = `Ardent Authentication v${Package.version}` })
  router.get('/auth/version', (ctx) => { ctx.body = { version: Package.version } })
  app.use(router.routes())

  // Every 15 refresh check for any tokens that expire "soon" and premtively refresh them
  // (and also at startup, in case there has been any downtime).
  cronTasks.rotateAccessTokens()
  cron.schedule('0 */15 * * * *', () => {
    cronTasks.rotateAccessTokens()
  })

  app.listen(ARDENT_AUTH_LOCAL_PORT)
  console.log('Ardent Authentication service started!')
})()

process.on('exit', () => console.log('Shutting down'))

process.on('uncaughtException', (e) => console.log('Uncaught exception:', e))
