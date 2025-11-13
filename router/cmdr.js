const { getAccessToken, getCache, setCache, deleteCache } = require('../lib/cmdr')
const { verifyJwt } = require('../lib/jwt')
const { FRONTIER_API_BASE_URL } = require('../lib/consts')

const CAPI_ENDPOINTS = [
  'profile',
  'market',
  'shipyard',
  'profile',
  'communitygoals',
  'journal',
  'fleetcarrier',
  'visitedstars'
]

module.exports = (router) => {
  // The root endpoint lists all the other endpoints supported by Frontier's API
  router.get('/auth/cmdr', async (ctx, next) => {
    try {
      const jwtPayload = await verifyJwt(ctx)
      const accessToken = await getAccessToken(jwtPayload.sub)
      const response = await fetch(FRONTIER_API_BASE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      ctx.body = await response.json()
    } catch (e) {
      ctx.status = 500
      ctx.body = {
        error: 'Frontier API request failed',
        message: e?.toString()
      }
    }
  })

  router.post('/auth/cmdr/delete', async (ctx, next) => {
    try {
      const jwtPayload = await verifyJwt(ctx)
      const cmdrId = jwtPayload.sub
      deleteCache(cmdrId)
    } catch (e) {
      ctx.status = 500
      ctx.body = {
        error: 'Delete API request failed',
        message: e?.toString()
      }
    }
  })

  router.get('/auth/cmdr/:endpoint', async (ctx, next) => {
    try {
      const { endpoint } = ctx.params

      if (!CAPI_ENDPOINTS.includes(endpoint)) {
        ctx.status = 404
        ctx.body = {
          error: 'Unsupported CAPI endpoint'
        }
        return
      }

      const jwtPayload = await verifyJwt(ctx)
      const cmdrId = jwtPayload.sub

      let responseData
      
      // Check cache to limit frequency of requests to the Frontier API
      const cachedResponse = getCache(cmdrId, endpoint)
      if (cachedResponse !== undefined) {
        responseData = cachedResponse
      } else {
        const accessToken = await getAccessToken(cmdrId)
        const response = await fetch(`${FRONTIER_API_BASE_URL}/${endpoint}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (endpoint === 'journal') {
          responseData = await response.text()
        } else if (endpoint === 'visitedstars') {
          responseData = await response.blob()
        } else {
          responseData = await response.json()
        }
        // Add response to CAPI cache
        setCache(cmdrId, endpoint, responseData)
      }

      ctx.body = responseData
    } catch (e) {
      ctx.status = 500
      ctx.body = {
        error: 'Frontier API request failed',
        message: e?.toString()
      }
    }
  })

  router.get('/auth/cmdr/journal/:year/:month/:day', async (ctx, next) => {
    try {
      const jwtPayload = await verifyJwt(ctx)
      const accessToken = await getAccessToken(jwtPayload.sub)
      const { year, month, day } = ctx.params
      const response = await fetch(`${FRONTIER_API_BASE_URL}/journal/${year}/${month}/${day}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      ctx.body = await response.text()
    } catch (e) {
      ctx.status = 500
      ctx.body = {
        error: 'Frontier API request failed',
        message: e?.toString()
      }
    }
  })
}
