const asyncHandler = require('express-async-handler')
const productModel = require('../models/productModel')
const transactionModel = require('../models/transactionModel')
const creditModel = require('../models/creditModel')
const expenseModel = require('../models/expenseModel')
const currencyRateModel = require('../models/currencyRateModel')
const { getScope } = require('../middleware/auth')
const { parseDateRange, inRange } = require('../utils/dateRange')

const loadScopedData = async (req) => {
  const scope = getScope(req)
  const range = parseDateRange(req.query)
  const products = await productModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId })
  const transactions = (await transactionModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId, type: req.query.type })).filter(tx => inRange(tx.occurredAt, range))
  const credits = (await creditModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId, status: req.query.status })).filter(credit => inRange(credit.occurredAt, range))
  const expenses = (await expenseModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId })).filter(expense => inRange(expense.occurredAt, range))
  return { products, transactions, credits, expenses }
}

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

const overview = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const { products, transactions, credits, expenses } = await loadScopedData(req)
  const sales = transactions.filter(tx => tx.type === 'sale')
  const pendingCredits = credits.filter(credit => credit.status === 'pending')
  const currencyRate = await currencyRateModel.getCurrent({ storeId: scope.storeId, ownerId: scope.ownerId })
  const rate = currencyRate?.lrdToUsd || 197

  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  const inventoryValueLRD = r2(products.reduce((sum, p) => sum + (Number(p.quantityInStock) || 0) * (Number(p.sellingPriceLRD) || 0), 0))
  const inventoryValueUSD = r2(products.reduce((sum, p) => sum + (Number(p.quantityInStock) || 0) * (Number(p.sellingPriceUSD) || 0), 0))
  const inventoryCostLRD = r2(products.reduce((sum, p) => sum + (Number(p.quantityInStock) || 0) * (Number(p.unitCost) || 0), 0))
  const inventoryWholesaleLRD = r2(products.reduce((sum, p) => sum + (Number(p.quantityInStock) || 0) * (Number(p.wholesalePriceLRD) || 0), 0))
  const inventoryWholesaleUSD = r2(products.reduce((sum, p) => sum + (Number(p.quantityInStock) || 0) * (Number(p.wholesalePriceUSD) || 0), 0))
  const expectedProfitLRD = r2(inventoryValueLRD - inventoryCostLRD)

  const totalRevenueLRD = r2(sales.reduce((sum, tx) => sum + (Number(tx.totalLRD) || 0), 0))
  const totalRevenueUSD = r2(sales.reduce((sum, tx) => sum + (Number(tx.totalUSD) || 0), 0))

  const totalSpentLRD = r2(sales.reduce((sum, tx) => {
    return sum + (tx.productsSold || []).reduce((s, item) => {
      const prod = productMap[item.productId]
      const unitCost = prod ? Number(prod.unitCost) || 0 : 0
      return s + unitCost * (Number(item.quantity) || 0)
    }, 0)
  }, 0))

  const totalExpensesLRD = r2(expenses.reduce((sum, e) => {
    const amount = Number(e.amount) || 0
    if (e.currency === 'USD') return sum + (amount * rate)
    return sum + amount
  }, 0))
  const totalExpensesUSD = r2(expenses.reduce((sum, e) => {
    const amount = Number(e.amount) || 0
    if (e.currency === 'USD') return sum + amount
    return sum + (amount / rate)
  }, 0))
  const periodProfitLRD = r2(totalRevenueLRD - totalSpentLRD - totalExpensesLRD)

  res.json({
    totalProducts: products.length,
    lowStockCount: products.filter(p => Number(p.quantityInStock) <= Number(p.restockLevel)).length,
    inventoryUnits: products.reduce((sum, p) => sum + (Number(p.quantityInStock) || 0), 0),
    inventoryValueLRD,
    inventoryValueUSD,
    inventoryCostLRD,
    inventoryWholesaleLRD,
    inventoryWholesaleUSD,
    expectedProfitLRD,
    totalSalesLRD: totalRevenueLRD,
    totalSalesUSD: totalRevenueUSD,
    totalSalesCount: sales.length,
    totalSpentLRD,
    periodProfitLRD,
    pendingCreditCount: credits.length,
    pendingCreditLRD: r2(pendingCredits.reduce((sum, c) => sum + (Number(c.totalLRD) || 0), 0)),
    pendingCreditUSD: r2(pendingCredits.reduce((sum, c) => sum + (Number(c.totalUSD) || 0), 0)),
    totalExpensesLRD,
    totalExpensesUSD,
    totalExpensesCount: expenses.length
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
