const asyncHandler = require('express-async-handler')
const creditModel = require('../models/creditModel')
const transactionModel = require('../models/transactionModel')
const productModel = require('../models/productModel')
const { getScope } = require('../middleware/auth')
const { totalsFromLineItems } = require('../utils/currency')
const { parseDateRange, inRange } = require('../utils/dateRange')
const { buildLineItems } = require('./transactionController')

const listCredits = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const range = parseDateRange(req.query)
  let credits = await creditModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId, status: req.query.status, customerName: req.query.customerName })
  credits = credits.filter(credit => inRange(credit.occurredAt, range))
  res.json(credits)
})

const createCredit = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const productsSold = await buildLineItems(req.body.productsSold || req.body.items || [])
  const totals = totalsFromLineItems(productsSold)

  for (const line of productsSold) {
    await productModel.adjustQuantity(line.productId, -line.quantity)
  }

  const transaction = await transactionModel.create({
    storeId: scope.storeId || req.body.storeId,
    ownerId: scope.ownerId || req.body.ownerId,
    type: 'sale',
    currency: 'CREDIT',
    paymentMethod: 'Credit',
    customerName: req.body.customerName || '',
    productsSold,
    subtotalLRD: totals.totalLRD,
    subtotalUSD: totals.totalUSD,
    totalLRD: totals.totalLRD,
    totalUSD: totals.totalUSD,
    occurredAt: req.body.occurredAt || req.body.date
  })

  const credit = await creditModel.create({
    ...req.body,
    storeId: scope.storeId || req.body.storeId,
    ownerId: scope.ownerId || req.body.ownerId,
    productsSold,
    totalLRD: Number(req.body.totalLRD ?? totals.totalLRD) || 0,
    totalUSD: Number(req.body.totalUSD ?? totals.totalUSD) || 0,
    transactionId: transaction.id,
    status: 'pending'
  })

  await transactionModel.update(transaction.id, { creditId: credit.id })

  res.status(201).json(credit)
})

const getCredit = asyncHandler(async (req, res) => {
  const credit = await creditModel.findById(req.params.id)
  if (!credit) {
    res.status(404)
    throw new Error('Credit not found')
  }
  res.json(credit)
})

const updateCredit = asyncHandler(async (req, res) => {
  const credit = await creditModel.update(req.params.id, req.body)
  res.json(credit)
})

const payCredit = asyncHandler(async (req, res) => {
  const credit = await creditModel.findById(req.params.id)
  if (!credit) {
    res.status(404)
    throw new Error('Credit not found')
  }

  const payment = await transactionModel.create({
    storeId: credit.storeId,
    ownerId: credit.ownerId,
    type: 'sale',
    currency: req.body.currency || credit.preferredCurrency || 'LRD',
    paymentMethod: req.body.paymentMethod || 'Cash',
    customerName: credit.customerName,
    creditId: credit.id,
    productsSold: [],
    totalLRD: Number(req.body.totalLRD ?? credit.totalLRD) || 0,
    totalUSD: Number(req.body.totalUSD ?? credit.totalUSD) || 0,
    occurredAt: req.body.occurredAt || req.body.date
  })

  const updated = await creditModel.update(credit.id, { status: 'paid', paidAt: new Date().toISOString(), paymentTransactionId: payment.id })
  res.json(updated)
})

module.exports = { listCredits, createCredit, getCredit, updateCredit, payCredit }
