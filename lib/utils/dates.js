/**
 * Get age of ISO date string in seconds
 */
function ageOfISODateInSeconds (isoDateString) {
  const d1 = new Date(isoDateString)
  const d2 = new Date()
  const diffInSeconds = (d2 - d1) / 1000
  return diffInSeconds
}

/**
 * Get current ISO timestamp
 */
function getISOTimestamp () {
  return new Date().toISOString()
}

/**
 * Calculate time between two timestamps (human readable)
 */
function timeBetweenTimestamps (minTimestamp, maxTimestamp) {
  const d1 = new Date(minTimestamp)
  const d2 = new Date(maxTimestamp)
  const diffInSeconds = (d2 - d1) / 1000
  if (diffInSeconds < 60) {
    return `${Math.floor(diffInSeconds)} seconds`
  } else if (diffInSeconds < 60 * 60) {
    return `${Math.floor(diffInSeconds / 60)} minutes`
  } else if (diffInSeconds < 60 * 60 * 24) {
    return `${Math.floor(diffInSeconds / (60 * 60))} hours`
  } else {
    return `${Math.floor(diffInSeconds / (60 * 60 * 24))} days`
  }
}

module.exports = {
  ageOfISODateInSeconds,
  getISOTimestamp,
  timeBetweenTimestamps
}
