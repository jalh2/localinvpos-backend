const asyncHandler = require('express-async-handler')
const userModel = require('../models/userModel')
const storeModel = require('../models/storeModel')
const { hashPassword, verifyPassword } = require('../utils/encryption')

const sanitizeUser = (user) => {
  if (!user) return null
  const { password, subscriptionCode, ...safeUser } = user
  return safeUser
}

const register = asyncHandler(async (req, res) => {
  const { username, email, password, displayName, phone, storeName, storeLocation, storeDescription, storePhone, baseCurrency, exchangeRateUsdToLrd } = req.body

  const loginName = String(username || email || '').trim().toLowerCase()
  if (!loginName || !password) {
    res.status(400)
    throw new Error('Username/email and password are required')
  }

  const existing = await userModel.findByUsername(loginName)
  if (existing) {
    res.status(400)
    throw new Error('User already exists')
  }

  if (!storeName) {
    res.status(400)
    throw new Error('Store name is required')
  }

  const store = await storeModel.create({
    name: storeName,
    location: storeLocation || '',
    description: storeDescription || '',
    phone: storePhone || '',
    baseCurrency: baseCurrency || 'LRD',
    exchangeRateUsdToLrd: Number(exchangeRateUsdToLrd) || 180
  })

  const user = await userModel.create({
    username: loginName,
    email: String(email || '').trim().toLowerCase(),
    password: hashPassword(password),
    role: 'owner',
    displayName: displayName || '',
    phone: phone || '',
    isActive: true,
    storeId: store.id,
    baseCurrency: baseCurrency || 'LRD',
    exchangeRateUsdToLrd: Number(exchangeRateUsdToLrd) || 180
  })

  await storeModel.update(store.id, { ownerId: user.id })

  const safeUser = sanitizeUser(user)
  req.session.user = safeUser
  res.status(201).json(safeUser)
})

const login = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body
  const loginName = username || email
  const user = await userModel.findByUsername(loginName)

  if (!user || !verifyPassword(password, user.password)) {
    res.status(401)
    throw new Error('Invalid credentials')
  }

  if (user.isActive === false) {
    res.status(403)
    throw new Error('Account is inactive')
  }

  const subCode = user.subscriptionCode || ''
  const verifiedCode = user.subscriptionVerifiedCode || ''
  const needsVerification = subCode !== '' && verifiedCode !== subCode

  if (subCode !== '' && verifiedCode !== '' && verifiedCode !== subCode) {
    res.status(403)
    throw new Error('Subscription verification failed. Please enter your subscription code.')
  }

  const safeUser = sanitizeUser(user)
  req.session.user = safeUser
  res.json({ ...safeUser, needsVerification })
})

const logout = asyncHandler(async (req, res) => {
  req.session.destroy(() => res.json({ success: true }))
})

const me = asyncHandler(async (req, res) => {
  const id = req.user && req.user.id
  if (!id) return res.json(null)
  const user = await userModel.findById(id)
  res.json(sanitizeUser(user))
})

const updateMe = asyncHandler(async (req, res) => {
  const id = req.user && req.user.id
  if (!id) {
    res.status(401)
    throw new Error('Not authorized')
  }

  const data = { ...req.body }
  delete data.role
  delete data.storeId
  if (data.password) data.password = hashPassword(data.password)

  const user = await userModel.update(id, data)
  req.session.user = sanitizeUser(user)
  res.json(sanitizeUser(user))
})

const verifySubscription = asyncHandler(async (req, res) => {
  const { username, email, code } = req.body
  const loginName = username || email
  if (!loginName || !code) {
    res.status(400)
    throw new Error('Username and code are required')
  }
  const user = await userModel.findByUsername(loginName)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }
  if (!user.subscriptionCode) {
    res.status(400)
    throw new Error('No subscription code has been set for this account')
  }
  if (user.subscriptionCode !== code) {
    res.status(403)
    throw new Error('Incorrect subscription code')
  }
  const updated = await userModel.update(user.id, { subscriptionVerifiedCode: code })
  if (user.role === 'owner' && user.storeId) {
    const employees = await userModel.findAll({ storeId: user.storeId, role: 'employee' })
    await Promise.all(employees.map(emp =>
      userModel.update(emp.id, { subscriptionCode: code, subscriptionVerifiedCode: code })
    ))
  }
  const safeUser = sanitizeUser(updated)
  req.session.user = safeUser
  res.json({ ...safeUser, needsVerification: false })
})

const getMyStore = asyncHandler(async (req, res) => {
  const storeId = req.user && req.user.storeId
  if (!storeId) return res.json(null)
  const store = await storeModel.findById(storeId)
  res.json(store)
})

module.exports = { sanitizeUser, register, login, logout, me, updateMe, getMyStore, verifySubscription }
