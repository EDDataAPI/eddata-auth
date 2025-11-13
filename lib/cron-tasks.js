const { secondsSinceEpoch } = require('./utils/auth')
const { authDb } = require('./db')
const { rotateTokens } = require('./cmdr')

// Frontier OAuth Access Tokens are actually valid for up to 4 hours at a time
// but we refresh them before ahead of time avoid ever making API calls with a
// token is even close to stale.
const TOKEN_MAX_EXPIRY_BEFORE_REFRESH_SECONDS = 60 * 60 // Update tokens that expire within the next hour

const selectTokensByExpiry = authDb.prepare('SELECT cmdrId, expiresAt FROM sessions WHERE expiresAt < @expiresAt ORDER BY expiresAt')
const deleteInvalidTokens = authDb.prepare('DELETE FROM sessions WHERE cmdrId = @cmdrId')

// Rotating tokens in this way allows users to sign to the site in from multiple devices
// (something the FDev API doesn't seem to allow) and supports mechanics like sending
// opt-in notificatons to users in response to system status changes or market trades.
async function rotateAccessTokens (cmdrId) {
  const expiresAt = new Date((secondsSinceEpoch() + TOKEN_MAX_EXPIRY_BEFORE_REFRESH_SECONDS) * 1000).toISOString()
  const tokens = selectTokensByExpiry.all({ expiresAt })
  for (const { cmdrId } of tokens) {
    try {
      await rotateTokens(cmdrId)
    } catch (e) {
      deleteInvalidTokens.run({ cmdrId })
      console.error(`Unable to rotate session tokens for cmdrId '${cmdrId}', session deleted`)
    }
  }
}

module.exports = {
  rotateAccessTokens
}
