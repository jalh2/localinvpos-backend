const asyncHandler = require('express-async-handler')
const productModel = require('../models/productModel')
const transactionModel = require('../models/transactionModel')
const { getScope } = require('../middleware/auth')
const { totalsFromLineItems } = require('../utils/currency')
const { parseDateRange, inRange } = require('../utils/dateRange')

const buildLineItems = async (items = []) => {
  const lines = []
  for (const item of items) {
    const product = await productModel.findById(item.productId || item.product)
    if (!product) throw new Error(`Product not found: ${item.productId || item.product}`)
    const quantity = Number(item.quantity) || 0
    if (Number(product.quantityInStock) < quantity) throw new Error(`Insufficient stock for ${product.productName}`)
    lines.push({
      productId: product.id,
      productName: product.productName,
      quantity,
      priceAtSale: {
        USD: Number(item.priceUSD ?? product.sellingPriceUSD) || 0,
        LRD: Number(item.priceLRD ?? product.sellingPriceLRD) || 0
      },
      unitCostAtSale: Number(product.unitCost) || 0
    })
  }
  return lines
}

const applyDiscount = (totals, body) => {
  const discountType = body.discountType || 'none'
  const discountValue = Number(body.discountValue) || 0
  let discountAmountLRD = 0
  let discountAmountUSD = 0

  if (discountType === 'percentage') {
    discountAmountLRD = totals.totalLRD * (discountValue / 100)
    discountAmountUSD = totals.totalUSD * (discountValue / 100)
  }
  if (discountType === 'fixed_lrd') discountAmountLRD = discountValue
  if (discountType === 'fixed_usd') discountAmountUSD = discountValue

  return {
    totalLRD: Math.max(totals.totalLRD - discountAmountLRD, 0),
    totalUSD: Math.max(totals.totalUSD - discountAmountUSD, 0),
    discountAmount: discountAmountLRD || discountAmountUSD
  }
}

const listTransactions = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const range = parseDateRange(req.query)
  let transactions = await transactionModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId, type: req.query.type, creditId: req.query.creditId })
  transactions = transactions.filter(tx => inRange(tx.occurredAt, range))
  res.json(transactions)
})

const createTransaction = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const productsSold = await buildLineItems(req.body.productsSold || req.body.items || [])
  const subtotal = totalsFromLineItems(productsSold)
  const discounted = applyDiscount(subtotal, req.body)

  for (const line of productsSold) {
    await productModel.adjustQuantity(line.productId, -line.quantity)
  }

  const transaction = await transactionModel.create({
    ...req.body,
    storeId: scope.storeId || req.body.storeId,
    ownerId: scope.ownerId || req.body.ownerId,
    type: req.body.type || 'sale',
    productsSold,
    subtotalLRD: subtotal.totalLRD,
    subtotalUSD: subtotal.totalUSD,
    discountAmount: discounted.discountAmount,
    totalLRD: Number(req.body.totalLRD ?? discounted.totalLRD) || 0,
    totalUSD: Number(req.body.totalUSD ?? discounted.totalUSD) || 0
  })

  res.status(201).json(transaction)
})

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionModel.findById(req.params.id)
  if (!transaction) {
    res.status(404)
    throw new Error('Transaction not found')
  }
  res.json(transaction)
})

module.exports = { listTransactions, createTransaction, getTransaction, buildLineItems }
