const asyncHandler = require('express-async-handler')
const userModel = require('../models/userModel')
const storeModel = require('../models/storeModel')
const { hashPassword, verifyPassword } = require('../utils/encryption')
const { getAccessibleStores, getAccessibleStoreIds } = require('../utils/userStores')

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
    storeIds: [store.id],
    baseCurrency: baseCurrency || 'LRD',
    exchangeRateUsdToLrd: Number(exchangeRateUsdToLrd) || 180
  })

  await storeModel.update(store.id, { ownerId: user.id })

  const safeUser = sanitizeUser(user)
  req.session.user = safeUser
  res.status(201).json(safeUser)
})

// Persists the user's chosen active store if it's one they can access
const applyStoreChoice = async (user, storeId) => {
  if (!storeId) return user
  const accessibleIds = await getAccessibleStoreIds(user)
  if (!accessibleIds.includes(storeId)) return user
  const storeIds = [...new Set([...(user.storeIds || []), user.storeId, storeId].filter(Boolean))]
  return userModel.update(user.id, { storeId, storeIds })
}

const lookupStores = asyncHandler(async (req, res) => {
  const { username, email } = req.body
  const user = await userModel.findByLogin(username || email)
  if (!user) {
    res.status(404)
    throw new Error('No account found with that username or email')
  }
  res.json({ stores: await getAccessibleStores(user) })
})

const login = asyncHandler(async (req, res) => {
  const { username, email, password, storeId } = req.body
  const loginName = username || email
  let user = await userModel.findByLogin(loginName)

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

  user = await applyStoreChoice(user, storeId)

  const safeUser = sanitizeUser(user)
  req.session.user = safeUser
  const stores = await getAccessibleStores(user)
  res.json({ ...safeUser, needsVerification, stores })
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
  delete data.storeIds
  if (data.password) data.password = hashPassword(data.password)

  const user = await userModel.update(id, data)
  req.session.user = sanitizeUser(user)
  res.json(sanitizeUser(user))
})

const verifySubscription = asyncHandler(async (req, res) => {
  const { username, email, code, storeId } = req.body
  const loginName = username || email
  if (!loginName || !code) {
    res.status(400)
    throw new Error('Username and code are required')
  }
  const user = await userModel.findByLogin(loginName)
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
  let updated = await userModel.update(user.id, { subscriptionVerifiedCode: code })
  updated = await applyStoreChoice(updated, storeId)
  if (user.role === 'owner' && user.storeId) {
    const employees = await userModel.findAll({ storeId: user.storeId, role: 'employee' })
    await Promise.all(employees.map(emp =>
      userModel.update(emp.id, { subscriptionCode: code, subscriptionVerifiedCode: code })
    ))
  }
  const safeUser = sanitizeUser(updated)
  req.session.user = safeUser
  const stores = await getAccessibleStores(updated)
  res.json({ ...safeUser, needsVerification: false, stores })
})

const getMyStore = asyncHandler(async (req, res) => {
  const storeId = req.user && req.user.storeId
  if (!storeId) return res.json(null)
  const store = await storeModel.findById(storeId)
  res.json(store)
})

const getMyStores = asyncHandler(async (req, res) => {
  const id = req.user && req.user.id
  if (!id) {
    res.status(401)
    throw new Error('Not authorized')
  }
  const user = await userModel.findById(id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }
  res.json(await getAccessibleStores(user))
})

const switchMyStore = asyncHandler(async (req, res) => {
  const id = req.user && req.user.id
  if (!id) {
    res.status(401)
    throw new Error('Not authorized')
  }
  const user = await userModel.findById(id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const { storeId } = req.body
  const accessibleIds = await getAccessibleStoreIds(user)
  if (!storeId || !accessibleIds.includes(storeId)) {
    res.status(403)
    throw new Error('You do not have access to that store')
  }

  const storeIds = [...new Set([...(user.storeIds || []), user.storeId].filter(Boolean))]
  const updated = await userModel.update(user.id, { storeId, storeIds })
  const safeUser = sanitizeUser(updated)
  req.session.user = safeUser
  const store = await storeModel.findById(storeId)
  res.json({ user: safeUser, store })
})

module.exports = { sanitizeUser, register, login, lookupStores, logout, me, updateMe, getMyStore, getMyStores, switchMyStore, verifySubscription }
