const crypto = require('crypto')

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

const isHashed = (stored) => typeof stored === 'string' && stored.includes(':')

const verifyPassword = (password, stored) => {
  if (!password || !stored) return false
  // Legacy accounts may have plaintext passwords stored without a salt:hash pair
  if (!isHashed(stored)) return String(password) === String(stored)
  const [salt, originalHash] = stored.split(':')
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(hash, 'hex'))
}

module.exports = { hashPassword, verifyPassword, isHashed }
