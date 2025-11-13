const { randomBytes, createHash } = require('crypto')

function generateCodeVerifierAndChallenge () {
  const codeVerifier = generateUrlSafeBase64ByteString()
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return {
    codeVerifier,
    codeChallenge
  }
}

function generateUrlSafeBase64ByteString (numberOfBytes = 32) {
  return randomBytes(numberOfBytes).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function secondsSinceEpoch () { return Math.floor(Date.now() / 1000) }

module.exports = {
  generateCodeVerifierAndChallenge,
  generateUrlSafeBase64ByteString,
  secondsSinceEpoch
}
