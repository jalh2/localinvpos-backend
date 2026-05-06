const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { listTransactions, createTransaction, getTransaction } = require('../controllers/transactionController')

const router = express.Router()

router.use(requireAuth)
router.get('/', listTransactions)
router.post('/', createTransaction)
router.get('/:id', getTransaction)

module.exports = router
