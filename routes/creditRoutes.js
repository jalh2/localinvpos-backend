const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { listCredits, createCredit, getCredit, updateCredit, payCredit } = require('../controllers/creditController')

const router = express.Router()

router.use(requireAuth)
router.get('/', listCredits)
router.post('/', createCredit)
router.get('/:id', getCredit)
router.put('/:id', updateCredit)
router.post('/:id/pay', payCredit)

module.exports = router
