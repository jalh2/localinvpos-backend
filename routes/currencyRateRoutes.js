const express = require('express')
const { requireRole } = require('../middleware/auth')
const { getCurrencyRate, updateCurrencyRate } = require('../controllers/currencyRateController')

const router = express.Router()

router.get('/', getCurrencyRate)
router.put('/', requireRole('owner', 'superadmin'), updateCurrencyRate)

module.exports = router
