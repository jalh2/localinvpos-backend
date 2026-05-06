const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { overview, sales, inventory, credits, cashier } = require('../controllers/reportController')

const router = express.Router()

router.use(requireAuth)
router.get('/overview', overview)
router.get('/sales', sales)
router.get('/inventory', inventory)
router.get('/credits', credits)
router.get('/cashier', cashier)

module.exports = router
