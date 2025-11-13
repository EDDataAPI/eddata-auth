const KoaRouter = require('koa-router')

const routes = {
  auth: require('./auth'),
  cmdr: require('./cmdr')
}

const router = new KoaRouter()
routes.auth(router)
routes.cmdr(router)

module.exports = router
