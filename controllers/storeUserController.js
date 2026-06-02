const asyncHandler = require('express-async-handler')
const userModel = require('../models/userModel')
const { hashPassword } = require('../utils/encryption')

const sanitizeUser = (user) => {
  if (!user) return null
  const { password, subscriptionCode, ...safeUser } = user
  return safeUser
}

const listStoreUsers = asyncHandler(async (req, res) => {
  const storeId = req.user?.storeId
  if (!storeId) {
    res.status(400)
    throw new Error('No store assigned')
  }

  const users = await userModel.findAll({ storeId })
  res.json(users.filter(u => u.role !== 'superadmin').map(sanitizeUser))
})

const createStoreUser = asyncHandler(async (req, res) => {
  const storeId = req.user?.storeId
  const userRole = req.user?.role

  if (!storeId) {
    res.status(400)
    throw new Error('No store assigned')
  }

  if (userRole !== 'owner' && userRole !== 'superadmin') {
    res.status(403)
    throw new Error('Only store owners can create users')
  }

  const { username, email, password, displayName, phone, role } = req.body
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

  const newRole = role === 'employee' ? 'employee' : 'owner'
  if (newRole === 'owner' && userRole !== 'superadmin') {
    res.status(403)
    throw new Error('Only superadmins can create additional owners')
  }

  let inheritedSubCode = ''
  let inheritedVerifiedCode = ''
  if (newRole === 'employee') {
    const owners = await userModel.findAll({ storeId, role: 'owner' })
    const storeOwner = owners[0] || null
    if (storeOwner) {
      inheritedSubCode = storeOwner.subscriptionCode || ''
      inheritedVerifiedCode = storeOwner.subscriptionVerifiedCode || ''
    }
  }

  const user = await userModel.create({
    username: loginName,
    email: String(email || '').trim().toLowerCase(),
    password: hashPassword(password),
    role: newRole,
    displayName: displayName || '',
    phone: phone || '',
    isActive: true,
    storeId,
    baseCurrency: req.user?.baseCurrency || 'LRD',
    exchangeRateUsdToLrd: req.user?.exchangeRateUsdToLrd || 180,
    subscriptionCode: inheritedSubCode,
    subscriptionVerifiedCode: inheritedVerifiedCode
  })

  res.status(201).json(sanitizeUser(user))
})

const getStoreUser = asyncHandler(async (req, res) => {
  const storeId = req.user?.storeId
  if (!storeId) {
    res.status(400)
    throw new Error('No store assigned')
  }

  const user = await userModel.findById(req.params.id)
  if (!user || user.storeId !== storeId || user.role === 'superadmin') {
    res.status(404)
    throw new Error('User not found')
  }

  res.json(sanitizeUser(user))
})

const updateStoreUser = asyncHandler(async (req, res) => {
  const storeId = req.user?.storeId
  const userRole = req.user?.role

  if (!storeId) {
    res.status(400)
    throw new Error('No store assigned')
  }

  const targetUser = await userModel.findById(req.params.id)
  if (!targetUser || targetUser.storeId !== storeId || targetUser.role === 'superadmin') {
    res.status(404)
    throw new Error('User not found')
  }

  if (targetUser.role === 'owner' && userRole !== 'superadmin' && targetUser.id !== req.user.id) {
    res.status(403)
    throw new Error('Only superadmins can modify other owners')
  }

  const data = { ...req.body }
  if (data.role === 'superadmin') delete data.role
  if (data.storeId) delete data.storeId
  if (data.password) data.password = hashPassword(data.password)

  const updated = await userModel.update(req.params.id, data)
  res.json(sanitizeUser(updated))
})

const deleteStoreUser = asyncHandler(async (req, res) => {
  const storeId = req.user?.storeId
  const userRole = req.user?.role

  if (!storeId) {
    res.status(400)
    throw new Error('No store assigned')
  }

  const targetUser = await userModel.findById(req.params.id)
  if (!targetUser || targetUser.storeId !== storeId || targetUser.role === 'superadmin') {
    res.status(404)
    throw new Error('User not found')
  }

  if (targetUser.role === 'owner' && userRole !== 'superadmin') {
    res.status(403)
    throw new Error('Only superadmins can delete owners')
  }

  if (targetUser.id === req.user.id) {
    res.status(400)
    throw new Error('Cannot delete yourself')
  }

  await userModel.remove(req.params.id)
  res.json({ success: true })
})

module.exports = { listStoreUsers, createStoreUser, getStoreUser, updateStoreUser, deleteStoreUser }
