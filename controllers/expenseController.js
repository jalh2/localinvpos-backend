const asyncHandler = require('express-async-handler')
const expenseModel = require('../models/expenseModel')
const { getScope } = require('../middleware/auth')
const { parseDateRange, inRange } = require('../utils/dateRange')

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Transport', 'Marketing', 'Supplies', 'Other']

const isValidCurrency = (currency) => ['LRD', 'USD'].includes(currency)

const listExpenses = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const range = parseDateRange(req.query)
  let items = await expenseModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId })
  if (range.from || range.to) {
    items = items.filter(e => inRange(e.occurredAt, range))
  }
  res.json(items)
})

const getExpense = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const item = await expenseModel.findById(req.params.id)
  if (!item) return res.status(404).json({ message: 'Expense not found' })
  if (item.ownerId !== scope.ownerId && scope.role !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  res.json(item)
})

const createExpense = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const { description, amount, currency, category, note, occurredAt } = req.body

  if (!description || !description.trim()) {
    return res.status(400).json({ message: 'Description is required' })
  }
  const amt = Number(amount)
  if (!isFinite(amt) || amt <= 0) {
    return res.status(400).json({ message: 'Invalid amount' })
  }
  const cur = currency || 'LRD'
  if (!isValidCurrency(cur)) {
    return res.status(400).json({ message: 'Invalid currency' })
  }

  const expense = await expenseModel.create({
    storeId: scope.storeId,
    ownerId: scope.ownerId,
    description: description.trim(),
    amount: amt,
    currency: cur,
    category: category || '',
    note: note || '',
    occurredAt: occurredAt || null
  })
  res.status(201).json(expense)
})

const updateExpense = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const existing = await expenseModel.findById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Expense not found' })
  if (existing.ownerId !== scope.ownerId && scope.role !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const allowed = ['description', 'amount', 'currency', 'category', 'note', 'occurredAt']
  const data = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key]
  }
  if (data.currency && !isValidCurrency(data.currency)) {
    return res.status(400).json({ message: 'Invalid currency' })
  }

  const expense = await expenseModel.update(req.params.id, data)
  res.json(expense)
})

const deleteExpense = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const existing = await expenseModel.findById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Expense not found' })
  if (existing.ownerId !== scope.ownerId && scope.role !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  await expenseModel.remove(req.params.id)
  res.json({ success: true })
})

module.exports = { listExpenses, getExpense, createExpense, updateExpense, deleteExpense, CATEGORIES }
