const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { getCurrencyRate, updateCurrencyRate } = require('../controllers/currencyRateController')

const router = express.Router()

router.use(requireAuth)
router.get('/', getCurrencyRate)
router.put('/', updateCurrencyRate)

module.exports = router
