const express = require('express')
const { requireRole } = require('../middleware/auth')
const {
  createStore,
  listStores,
  getStore,
  updateStore,
  createOwner,
  listOwners,
  getOwner,
  updateOwner,
  overview
} = require('../controllers/adminController')

const router = express.Router()

router.use(requireRole('superadmin'))

router.get('/overview', overview)
router.post('/stores', createStore)
router.get('/stores', listStores)
router.get('/stores/:id', getStore)
router.put('/stores/:id', updateStore)
router.post('/owners', createOwner)
router.get('/owners', listOwners)
router.get('/owners/:id', getOwner)
router.put('/owners/:id', updateOwner)

module.exports = router
