// Turn an JavaScript object into URL Encoded Form Data
module.exports = (obj) => Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
