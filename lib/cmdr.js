const { updateDb, insertOrReplaceIntoDb } = require('./utils/sql')
const { secondsSinceEpoch } = require('./utils/auth')
const { authDb } = require('./db')
const { AUTH_CLIENT_ID } = require('./consts')
const formData = require('./form-data')
const { ageOfISODateInSeconds } = require('./utils/dates')

const selectCmdrById = authDb.prepare('SELECT * FROM sessions WHERE cmdrId = @cmdrId')
const selectCacheByCmdrIdAndKey = authDb.prepare('SELECT * FROM cache WHERE cmdrId = @cmdrId and key = @key')
const deleteCacheByCmdrId = authDb.prepare('DELETE FROM cache WHERE cmdrId = @cmdrId')

// How old a cache item can be (in seconds) before we treat it as expired
// The cache means that no matter how many tabs / windows / devices a user has
// open or how many times they refresh or how quickly the navigate between pages
// the Frontier API doesn't end up being called more than is reasonable and that
// we don't then have to worry about handling running into CAPI rate limts.
const CAPI_CACHE_MAX_AGE = 5

function getAccessToken (cmdrId) {
  const cmdr = selectCmdrById.get({ cmdrId })
  return cmdr?.accessToken
}

async function rotateTokens (cmdrId) {
  const cmdr = selectCmdrById.get({ cmdrId })
  if (!cmdr) throw new Error('Could not find Access Token or Refresh token for account')

  const response = await fetch('https://auth.frontierstore.net/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData({
      client_id: AUTH_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: cmdr.refreshToken
    })
  })
  const responsePayload = await response.json()

  if (responsePayload?.error) {
    if (responsePayload?.error === 'invalid_token') {
      // The Access Token is valid for 4 hours, you can get a new one using a
      // Refresh Token. When the Refresh Token itself has expired the Frontier
      // API returns an invalid_token error.
      throw new Error('Frontier API Refresh Token has expired')
    } else {
      console.error('Error response returned by Frontier API while refreshing Access Token', responsePayload)
      throw new Error(`Error response returned by Frontier API while refreshing Access Token: ${responsePayload?.error} :: ${responsePayload?.error_description}`)
    }
  } else if (!responsePayload.token_type) {
    console.error('Unexpected response returned by Frontier API while refreshing Access Token', responsePayload)
    throw new Error('Unexpected response returned by Frontier API while refreshing Access Token')
  }

  const accessToken = responsePayload.access_token
  const refreshToken = responsePayload.refresh_token
  const expiresAt = new Date((secondsSinceEpoch() + responsePayload.expires_in) * 1000).toISOString()

  saveTokens(cmdr.cmdrId, accessToken, refreshToken, expiresAt)

  return true
}

function saveTokens (cmdrId, accessToken, refreshToken, expiresAt) {
  const timestamp = new Date().toISOString()
  const cmdrData = {
    cmdrId,
    accessToken,
    refreshToken,
    expiresAt,
    updatedAt: timestamp
  }
  if (selectCmdrById.get({ cmdrId })) {
    // Update existing token, preserving any existing data (e.g. createdAt)
    updateDb(authDb, 'sessions', cmdrData, 'cmdrId = @cmdrId')
  } else {
    // Insert new row (or overwrite, in case of race condition)
    cmdrData.createdAt = timestamp
    insertOrReplaceIntoDb(authDb, 'sessions', cmdrData)
  }
}

function getCache (cmdrId, key) {
  let cachedValue
  try {
    const cache = selectCacheByCmdrIdAndKey.get({ cmdrId, key })
    const cacheAge = ageOfISODateInSeconds(cache.updatedAt)

    // If the cage is older than CAPI_CACHE_MAX_AGE treat as a cache miss
    if (cacheAge > CAPI_CACHE_MAX_AGE) return undefined

    cachedValue = cache.value

    // Attempt to deseralize cached data into object (but ignore if that fails)
    cachedValue = JSON.parse(cache.value)
  } catch (e) { }
  return cachedValue
}

function setCache (cmdrId, key, value) {
  try {
    const cmdrData = {
      cmdrId,
      key,
      value: typeof value == 'object' ? JSON.stringify(value) : value,
      updatedAt: new Date().toISOString()
    }
    insertOrReplaceIntoDb(authDb, 'cache', cmdrData)
  } catch (e) {
    console.error(`updateCache failed to cache value for '${key}'`)
  }
}

function deleteCache (cmdrId) {
  deleteCacheByCmdrId.run({ cmdrId })
}

module.exports = {
  getAccessToken,
  rotateTokens,
  saveTokens,
  getCache,
  setCache,
  deleteCache
}
