const { getAccessToken, getCache, setCache, deleteCache } = require('../lib/cmdr')
const { verifyJwt } = require('../lib/jwt')
const { FRONTIER_API_BASE_URL } = require('../lib/consts')

const CAPI_ENDPOINTS = [
  'profile',
  'market',
  'shipyard',
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
      if (!accessToken) {
        ctx.status = 401
        ctx.body = { error: 'No valid access token found' }
        return
      }
      const response = await fetch(FRONTIER_API_BASE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!response.ok) {
        ctx.status = response.status
        ctx.body = { error: 'Frontier API request failed', status: response.status }
        return
      }
      ctx.body = await response.json()
    } catch (e) {
      console.error('Error in /auth/cmdr:', e)
      if (e.message && (e.message.includes('JWT') || e.message.includes('signed in'))) {
        ctx.status = 401
        ctx.body = { error: 'Unauthorized', message: e.message }
      } else {
        ctx.status = 500
        ctx.body = {
          error: 'Frontier API request failed',
          message: e?.toString(),
          stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
        }
      }
    }
  })

  router.post('/auth/cmdr/delete', async (ctx, next) => {
    try {
      const jwtPayload = await verifyJwt(ctx)
      const cmdrId = jwtPayload.sub
      deleteCache(cmdrId)
      ctx.body = { success: true }
    } catch (e) {
      console.error('Error in /auth/cmdr/delete:', e)
      if (e.message && (e.message.includes('JWT') || e.message.includes('signed in'))) {
        ctx.status = 401
        ctx.body = { error: 'Unauthorized', message: e.message }
      } else {
        ctx.status = 500
        ctx.body = {
          error: 'Delete API request failed',
          message: e?.toString(),
          stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
        }
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
        if (!accessToken) {
          ctx.status = 401
          ctx.body = { error: 'No valid access token found' }
          return
        }
        const response = await fetch(`${FRONTIER_API_BASE_URL}/${endpoint}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (!response.ok) {
          ctx.status = response.status
          ctx.body = { error: 'Frontier API request failed', status: response.status }
          return
        }
        if (endpoint === 'journal') {
          responseData = await response.text()
        } else if (endpoint === 'visitedstars') {
          // visitedstars returns a gzip compressed file
          const buffer = await response.arrayBuffer()
          responseData = Buffer.from(buffer)
          ctx.set('Content-Type', 'application/gzip')
        } else {
          responseData = await response.json()
        }
        // Add response to CAPI cache (don't cache visitedstars due to size)
        if (endpoint !== 'visitedstars') {
          setCache(cmdrId, endpoint, responseData)
        }
      }

      ctx.body = responseData
    } catch (e) {
      console.error(`Error in /auth/cmdr/${ctx.params.endpoint}:`, e)
      if (e.message && (e.message.includes('JWT') || e.message.includes('signed in'))) {
        ctx.status = 401
        ctx.body = { error: 'Unauthorized', message: e.message }
      } else {
        ctx.status = 500
        ctx.body = {
          error: 'Frontier API request failed',
          message: e?.toString(),
          stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
        }
      }
    }
  })

  router.get('/auth/cmdr/journal/:year/:month/:day', async (ctx, next) => {
    try {
      const jwtPayload = await verifyJwt(ctx)
      const accessToken = await getAccessToken(jwtPayload.sub)
      if (!accessToken) {
        ctx.status = 401
        ctx.body = { error: 'No valid access token found' }
        return
      }
      const { year, month, day } = ctx.params
      const response = await fetch(`${FRONTIER_API_BASE_URL}/journal/${year}/${month}/${day}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!response.ok) {
        ctx.status = response.status
        ctx.body = { error: 'Frontier API request failed', status: response.status }
        return
      }
      ctx.body = await response.text()
    } catch (e) {
      console.error('Error in /auth/cmdr/journal:', e)
      if (e.message && (e.message.includes('JWT') || e.message.includes('signed in'))) {
        ctx.status = 401
        ctx.body = { error: 'Unauthorized', message: e.message }
      } else {
        ctx.status = 500
        ctx.body = {
          error: 'Frontier API request failed',
          message: e?.toString(),
          stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
        }
      }
    }
  })
}
