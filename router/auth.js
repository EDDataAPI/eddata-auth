const { createJwt } = require('../lib/jwt')
const {
  generateCodeVerifierAndChallenge,
  generateUrlSafeBase64ByteString,
  secondsSinceEpoch
} = require('../lib/utils/auth')
const formData = require('../lib/form-data')
const { saveTokens } = require('../lib/cmdr')

const {
  AUTH_CLIENT_ID,
  AUTH_CALLBACK_URL,
  AUTH_SIGNED_IN_URL,
  AUTH_SIGNED_OUT_URL,
  AUTH_ERROR_URL,
  COOKIE_DEFAULT_OPTIONS,
  JWT_COOKIE_OPTIONS,
  FRONTIER_API_BASE_URL
} = require('../lib/consts')

module.exports = (router) => {
  router.get('/auth/signin', async (ctx, next) => {
    const state = generateUrlSafeBase64ByteString()
    const { codeVerifier, codeChallenge } = generateCodeVerifierAndChallenge()

    // These are re-geneated for every sign in attempt to avoid possibility of
    // reuse of stale tokens after a failed / previous login attempt
    ctx.cookies.set('auth.state', state, COOKIE_DEFAULT_OPTIONS)
    ctx.cookies.set('auth.codeVerifier', codeVerifier, COOKIE_DEFAULT_OPTIONS)

    const url = 'https://auth.frontierstore.net/auth?audience=frontier&scope=auth%20capi' +
      '&response_type=code' +
      `&client_id=${AUTH_CLIENT_ID}` +
      `&code_challenge=${codeChallenge}` +
      '&code_challenge_method=S256' +
      `&state=${state}` +
      `&redirect_uri=${AUTH_CALLBACK_URL}`

    ctx.redirect(url)
  })

  router.get('/auth/callback', async (ctx, next) => {
    const { code, state } = ctx.query
    const stateFromCookie = ctx.cookies.get('auth.state')
    const codeVerifier = ctx.cookies.get('auth.codeVerifier')

    try {
      if (stateFromCookie !== state) throw new Error('Callback state check failed')

      // Request tokens from fdev
      const response = await fetch('https://auth.frontierstore.net/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData({
          client_id: AUTH_CLIENT_ID,
          redirect_uri: AUTH_CALLBACK_URL,
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier
        })
      })
      const responsePayload = await response.json()

      const accessToken = responsePayload.access_token
      const refreshToken = responsePayload.refresh_token
      const expiresAt = new Date((secondsSinceEpoch() + responsePayload.expires_in) * 1000).toISOString()

      // Use Access Token to get Cmdr ID (required to sign in)
      const frontierApiResponse = await fetch(
        `${FRONTIER_API_BASE_URL}/profile`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const profile = await frontierApiResponse.json()

      // Ensure cmdrId is always treated as a string and not a number
      const cmdrId = String(profile.commander.id)
      const cmdrName = profile.commander.name

      // Save Commander ID and tokens to database
      //
      // This will, by design, overwite older credentials associated
      // with the same Commander ID, as Frontier's Oauth implementation
      // does not seem to fully support an account maintaining
      // concurrent sessions with the same third party Oauth client.
      saveTokens(cmdrId, accessToken, refreshToken, expiresAt)

      // Create JWT which will can be used to look up tokens
      // from the database to make API requests in future
      const jwt = createJwt({ sub: cmdrId, name: cmdrName })

      ctx.cookies.set('auth.jwt', jwt, JWT_COOKIE_OPTIONS)

      ctx.redirect(AUTH_SIGNED_IN_URL)
    } catch (e) {
      ctx.redirect(`${AUTH_ERROR_URL}?error=${encodeURIComponent(e?.toString())}`)
    }
  })

  // This is a really simple CSRF implementation, but this is very low stakes as
  // both the Ardent REST API and the Frontier REST API are read only and the
  // JWT is stored in an HTTP only cookie; this is only intended as simple
  // protection against being forceably signed out.
  router.get('/auth/csrftoken', async (ctx, next) => {
    let csrfToken = ctx.cookies.get('auth.csrfToken')
    if (!csrfToken) {
      csrfToken = generateUrlSafeBase64ByteString()
      ctx.cookies.set('auth.csrfToken', csrfToken, COOKIE_DEFAULT_OPTIONS)
    }
    ctx.body = { csrfToken }
  })

  router.post('/auth/signout', async (ctx, next) => {
    const { csrfToken } = ctx.request.body
    try {
      const csrfTokenFromCookie = ctx.cookies.get('auth.csrfToken')
      if (csrfToken !== csrfTokenFromCookie) throw new Error('CSRF token validation failed')
      // Matching options (other than expiry) are required for cookies to be unset
      ctx.cookies.set('auth.jwt', null, COOKIE_DEFAULT_OPTIONS)
      ctx.cookies.set('auth.state', null, COOKIE_DEFAULT_OPTIONS)
      ctx.cookies.set('auth.codeVerifier', null, COOKIE_DEFAULT_OPTIONS)
      ctx.cookies.set('auth.csrfToken', null, COOKIE_DEFAULT_OPTIONS)
      ctx.redirect(AUTH_SIGNED_OUT_URL)
    } catch (e) {
      ctx.redirect(`${AUTH_ERROR_URL}?error=${encodeURIComponent(e?.toString())}`)
    }
  })
}
