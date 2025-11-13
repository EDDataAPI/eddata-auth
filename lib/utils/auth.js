const { randomBytes, createHash } = require('crypto')
const fs = require('fs')

/**
 * Generate PKCE code verifier and challenge for OAuth2 flow
 */
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

/**
 * Generate URL-safe base64 random string
 */
function generateUrlSafeBase64ByteString (numberOfBytes = 32) {
  return randomBytes(numberOfBytes).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Get current Unix timestamp in seconds
 */
function secondsSinceEpoch () { 
  return Math.floor(Date.now() / 1000) 
}

/**
 * Generate hash for a file (Node.js 24 optimized)
 */
async function getFileHash (pathToFile, algorithm = 'sha256') {
  return await new Promise((resolve, reject) => {
    const hash = createHash(algorithm)
    const rs = fs.createReadStream(pathToFile)
    rs.on('error', reject)
    rs.on('data', chunk => hash.update(chunk))
    rs.on('end', () => resolve(hash.digest('hex')))
  })
}

module.exports = {
  generateCodeVerifierAndChallenge,
  generateUrlSafeBase64ByteString,
  secondsSinceEpoch,
  getFileHash
}
