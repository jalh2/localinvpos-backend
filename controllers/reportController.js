const asyncHandler = require('express-async-handler')
const productModel = require('../models/productModel')
const transactionModel = require('../models/transactionModel')
const creditModel = require('../models/creditModel')
const { getScope } = require('../middleware/auth')
const { parseDateRange, inRange } = require('../utils/dateRange')

const loadScopedData = async (req) => {
  const scope = getScope(req)
  const range = parseDateRange(req.query)
  const products = await productModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId })
  const transactions = (await transactionModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId, type: req.query.type })).filter(tx => inRange(tx.occurredAt, range))
  const credits = (await creditModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId, status: req.query.status })).filter(credit => inRange(credit.occurredAt, range))
  return { products, transactions, credits }
}

const overview = asyncHandler(async (req, res) => {
  const { products, transactions, credits } = await loadScopedData(req)
  const sales = transactions.filter(tx => tx.type === 'sale')
  const pendingCredits = credits.filter(credit => credit.status === 'pending')

  res.json({
    totalProducts: products.length,
    lowStockCount: products.filter(product => Number(product.quantityInStock) <= Number(product.restockLevel)).length,
    inventoryUnits: products.reduce((sum, product) => sum + (Number(product.quantityInStock) || 0), 0),
    inventoryValueLRD: products.reduce((sum, product) => sum + ((Number(product.quantityInStock) || 0) * (Number(product.sellingPriceLRD) || 0)), 0),
    inventoryValueUSD: products.reduce((sum, product) => sum + ((Number(product.quantityInStock) || 0) * (Number(product.sellingPriceUSD) || 0)), 0),
    totalSalesLRD: sales.reduce((sum, tx) => sum + (Number(tx.totalLRD) || 0), 0),
    totalSalesUSD: sales.reduce((sum, tx) => sum + (Number(tx.totalUSD) || 0), 0),
    pendingCreditLRD: pendingCredits.reduce((sum, credit) => sum + (Number(credit.totalLRD) || 0), 0),
    pendingCreditUSD: pendingCredits.reduce((sum, credit) => sum + (Number(credit.totalUSD) || 0), 0)
  })
})

const sales = asyncHandler(async (req, res) => {
  const { transactions } = await loadScopedData(req)
  res.json(transactions.filter(tx => tx.type === 'sale'))
})

const inventory = asyncHandler(async (req, res) => {
  const { products } = await loadScopedData(req)
  res.json({ products, lowStock: products.filter(product => Number(product.quantityInStock) <= Number(product.restockLevel)) })
})

const credits = asyncHandler(async (req, res) => {
  const { credits } = await loadScopedData(req)
  res.json(credits)
})

const cashier = asyncHandler(async (req, res) => {
  const { transactions } = await loadScopedData(req)
  const summary = transactions.reduce((acc, tx) => {
    const method = tx.paymentMethod || 'Unknown'
    const currency = tx.currency || 'LRD'
    acc.byPaymentMethod[method] = (acc.byPaymentMethod[method] || 0) + 1
    acc.byCurrency[currency] = (acc.byCurrency[currency] || 0) + 1
    return acc
  }, { byPaymentMethod: {}, byCurrency: {} })
  res.json(summary)
})

module.exports = { overview, sales, inventory, credits, cashier }
