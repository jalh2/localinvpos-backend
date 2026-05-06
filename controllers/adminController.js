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

const createOwner = asyncHandler(async (req, res) => {
  const existing = await userModel.findByUsername(req.body.username || req.body.email)
  if (existing) {
    res.status(400)
    throw new Error('User already exists')
  }

  let storeId = req.body.storeId
  let store = storeId ? await storeModel.findById(storeId) : null

  if (!store && req.body.storeName) {
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

  const owner = await userModel.create({
    username: req.body.username || req.body.email,
    email: req.body.email || '',
    password: hashPassword(req.body.password || 'password'),
    role: 'owner',
    displayName: req.body.displayName || req.body.name || '',
    phone: req.body.phone || '',
    isActive: req.body.isActive !== false,
    storeId,
    baseCurrency: req.body.baseCurrency || 'LRD',
    exchangeRateUsdToLrd: Number(req.body.exchangeRateUsdToLrd) || 180
  })

  if (storeId) await storeModel.update(storeId, { ownerId: owner.id })

  res.status(201).json(sanitizeUser(owner))
})

const listOwners = asyncHandler(async (req, res) => {
  const owners = await userModel.findAll({ role: 'owner', storeId: req.query.storeId })
  res.json(owners.map(sanitizeUser))
})

const getOwner = asyncHandler(async (req, res) => {
  const owner = await userModel.findById(req.params.id)
  if (!owner) {
    res.status(404)
    throw new Error('Owner not found')
  }
  res.json(sanitizeUser(owner))
})

const updateOwner = asyncHandler(async (req, res) => {
  const data = { ...req.body }
  delete data.role
  if (data.password) data.password = hashPassword(data.password)
  const owner = await userModel.update(req.params.id, data)
  if (data.storeId) await storeModel.update(data.storeId, { ownerId: owner.id })
  res.json(sanitizeUser(owner))
})

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

module.exports = { createStore, listStores, getStore, updateStore, createOwner, listOwners, getOwner, updateOwner, overview }
