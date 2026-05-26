const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const { listProducts, createProduct, getProduct, updateProduct, deleteProduct, restockProduct } = require('../controllers/productController')

const router = express.Router()

router.use(requireAuth)
router.get('/', listProducts)
router.post('/', requireRole('owner', 'superadmin'), createProduct)
router.get('/:id', getProduct)
router.put('/:id', requireRole('owner', 'superadmin'), updateProduct)
router.delete('/:id', requireRole('owner', 'superadmin'), deleteProduct)
router.post('/:id/restock', requireRole('owner', 'superadmin'), restockProduct)

module.exports = router
