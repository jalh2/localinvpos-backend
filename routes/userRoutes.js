const express = require('express')
const { attachUser, requireAuth } = require('../middleware/auth')
const { register, login, lookupStores, logout, me, updateMe, getMyStore, getMyStores, switchMyStore, verifySubscription } = require('../controllers/userController')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/lookup-stores', lookupStores)
router.post('/verify-subscription', verifySubscription)
router.post('/logout', logout)
router.get('/me', attachUser, me)
router.put('/me', requireAuth, updateMe)
router.get('/me/store', requireAuth, getMyStore)
router.get('/me/stores', requireAuth, getMyStores)
router.put('/me/store', requireAuth, switchMyStore)

module.exports = router
