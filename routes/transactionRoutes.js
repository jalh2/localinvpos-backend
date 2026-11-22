const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { listTransactions, createTransaction, createReturn, getTransaction } = require('../controllers/transactionController')

const router = express.Router()

router.use(requireAuth)
router.get('/', listTransactions)
router.post('/', createTransaction)
router.post('/return', createReturn)
router.get('/:id', getTransaction)

module.exports = router
