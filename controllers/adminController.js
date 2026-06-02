const asyncHandler = require('express-async-handler')
const userModel = require('../models/userModel')
const storeModel = require('../models/storeModel')
const productModel = require('../models/productModel')
const transactionModel = require('../models/transactionModel')
const creditModel = require('../models/creditModel')
const { hashPassword } = require('../utils/encryption')
const { sanitizeUser } = require('./userController')

const createStore = asyncHandler(async (req, res) => {
  const store = await storeModel.create(req.body)
  res.status(201).json(store)
})

const listStores = asyncHandler(async (req, res) => {
  const stores = await storeModel.findAll(req.query)
  res.json(stores)
})

const getStore = asyncHandler(async (req, res) => {
  const store = await storeModel.findById(req.params.id)
  if (!store) {
    res.status(404)
    throw new Error('Store not found')
  }
  res.json(store)
})

const updateStore = asyncHandler(async (req, res) => {
  const store = await storeModel.update(req.params.id, req.body)
  res.json(store)
})

const createUser = asyncHandler(async (req, res) => {
  const existing = await userModel.findByUsername(req.body.username || req.body.email)
  if (existing) {
    res.status(400)
    throw new Error('User already exists')
  }

  const role = req.body.role === 'employee' ? 'employee' : 'owner'

  let storeId = req.body.storeId
  let store = storeId ? await storeModel.findById(storeId) : null

  if (!store && req.body.storeName && role === 'owner') {
    store = await storeModel.create({
      name: req.body.storeName,
      location: req.body.storeLocation || '',
      description: req.body.storeDescription || '',
      phone: req.body.storePhone || '',
      baseCurrency: req.body.baseCurrency || 'LRD',
      exchangeRateUsdToLrd: Number(req.body.exchangeRateUsdToLrd) || 180
    })
    storeId = store.id
  }

  let resolvedSubCode = String(req.body.subscriptionCode || '').trim()
  let resolvedVerifiedCode = ''
  const now = new Date().toISOString()

  if (role === 'employee' && storeId) {
    const owners = await userModel.findAll({ storeId, role: 'owner' })
    const storeOwner = owners[0] || null
    if (storeOwner) {
      resolvedSubCode = storeOwner.subscriptionCode || ''
      resolvedVerifiedCode = storeOwner.subscriptionVerifiedCode || ''
    }
  }

  const user = await userModel.create({
    username: req.body.username || req.body.email,
    email: req.body.email || '',
    password: hashPassword(req.body.password || 'password'),
    role,
    displayName: req.body.displayName || req.body.name || '',
    phone: req.body.phone || '',
    isActive: req.body.isActive !== false,
    storeId,
    baseCurrency: req.body.baseCurrency || 'LRD',
    exchangeRateUsdToLrd: Number(req.body.exchangeRateUsdToLrd) || 180,
    subscriptionCode: resolvedSubCode,
    subscriptionVerifiedCode: resolvedVerifiedCode,
    subscriptionCodeSetAt: resolvedSubCode ? now : null
  })

  if (storeId && role === 'owner') await storeModel.update(storeId, { ownerId: user.id })

  res.status(201).json({ ...sanitizeUser(user), subscriptionCode: resolvedSubCode, subscriptionCodeSetAt: resolvedSubCode ? now : null })
})

const createOwner = createUser

const listUsers = asyncHandler(async (req, res) => {
  const { role, storeId } = req.query
  const filter = {}
  if (role) filter.role = role
  if (storeId) filter.storeId = storeId
  const users = await userModel.findAll(filter)
  res.json(users.filter(u => u.role !== 'superadmin').map(sanitizeUser))
})

const listOwners = asyncHandler(async (req, res) => {
  const owners = await userModel.findAll({ role: 'owner', storeId: req.query.storeId })
  res.json(owners.map(sanitizeUser))
})

const getUser = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.params.id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }
  res.json(sanitizeUser(user))
})

const getOwner = getUser

const updateUser = asyncHandler(async (req, res) => {
  const data = { ...req.body }
  if (data.role === 'superadmin') delete data.role
  if (data.password) data.password = hashPassword(data.password)
  const user = await userModel.update(req.params.id, data)
  if (data.storeId && user.role === 'owner') await storeModel.update(data.storeId, { ownerId: user.id })
  res.json(sanitizeUser(user))
})

const updateOwner = updateUser

const overview = asyncHandler(async (req, res) => {
  const stores = await storeModel.findAll()
  const owners = await userModel.findAll({ role: 'owner' })
  const products = await productModel.findAll()
  const transactions = await transactionModel.findAll({ type: 'sale' })
  const credits = await creditModel.findAll()

  res.json({
    totalStores: stores.length,
    totalOwners: owners.length,
    totalProducts: products.length,
    totalTransactions: transactions.length,
    pendingCredits: credits.filter(credit => credit.status === 'pending').length,
    totalSalesLRD: transactions.reduce((sum, tx) => sum + (Number(tx.totalLRD) || 0), 0),
    totalSalesUSD: transactions.reduce((sum, tx) => sum + (Number(tx.totalUSD) || 0), 0)
  })
})

const setSubscriptionCode = asyncHandler(async (req, res) => {
  const { code } = req.body
  if (!code || !String(code).trim()) {
    res.status(400)
    throw new Error('code is required')
  }
  const trimmedCode = String(code).trim()
  const user = await userModel.findById(req.params.id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }
  const now = new Date().toISOString()
  const updated = await userModel.update(user.id, {
    subscriptionCode: trimmedCode,
    subscriptionCodeSetAt: now
  })
  if (user.storeId) {
    const employees = await userModel.findAll({ storeId: user.storeId, role: 'employee' })
    await Promise.all(employees.map(emp =>
      userModel.update(emp.id, { subscriptionCode: trimmedCode, subscriptionCodeSetAt: now })
    ))
  }
  res.json({ ...sanitizeUser(updated), subscriptionCode: trimmedCode, subscriptionCodeSetAt: now })
})

module.exports = { createStore, listStores, getStore, updateStore, createUser, createOwner, listUsers, listOwners, getUser, getOwner, updateUser, updateOwner, overview, setSubscriptionCode }
