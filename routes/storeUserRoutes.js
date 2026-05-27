const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const {
  listStoreUsers,
  createStoreUser,
  getStoreUser,
  updateStoreUser,
  deleteStoreUser
} = require('../controllers/storeUserController')

const router = express.Router()

router.use(requireAuth)

router.get('/', listStoreUsers)
router.post('/', requireRole('owner', 'superadmin'), createStoreUser)
router.get('/:id', getStoreUser)
router.put('/:id', requireRole('owner', 'superadmin'), updateStoreUser)
router.delete('/:id', requireRole('owner', 'superadmin'), deleteStoreUser)

module.exports = router
