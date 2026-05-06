const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { listProducts, createProduct, getProduct, updateProduct, deleteProduct, restockProduct } = require('../controllers/productController')

const router = express.Router()

router.use(requireAuth)
router.get('/', listProducts)
router.post('/', createProduct)
router.get('/:id', getProduct)
router.put('/:id', updateProduct)
router.delete('/:id', deleteProduct)
router.post('/:id/restock', restockProduct)

module.exports = router
