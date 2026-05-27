const express = require('express')
const { attachUser, requireAuth } = require('../middleware/auth')
const { register, login, logout, me, updateMe, getMyStore } = require('../controllers/userController')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get('/me', attachUser, me)
router.put('/me', requireAuth, updateMe)
router.get('/me/store', requireAuth, getMyStore)

module.exports = router
