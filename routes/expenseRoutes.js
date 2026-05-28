const express = require('express')
const router = express.Router()
const { listExpenses, getExpense, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController')
const { requireAuth, requireRole } = require('../middleware/auth')

router.use(requireAuth)

router.get('/', listExpenses)
router.post('/', createExpense)
router.get('/:id', getExpense)
router.put('/:id', updateExpense)
router.delete('/:id', requireRole('owner', 'superadmin'), deleteExpense)

module.exports = router
