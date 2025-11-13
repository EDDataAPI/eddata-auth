function ageOfISODateInSeconds (isoDateString) {
  const d1 = new Date(isoDateString)
  const d2 = new Date()
  const diffInSeconds = (d2 - d1) / 1000
  return diffInSeconds
}

module.exports = {
  ageOfISODateInSeconds
}
