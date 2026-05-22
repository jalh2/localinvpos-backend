const asyncHandler = require('express-async-handler')
const currencyRateModel = require('../models/currencyRateModel')
const { getScope } = require('../middleware/auth')

const getCurrencyRate = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const rate = await currencyRateModel.getCurrent({ storeId: scope.storeId, ownerId: scope.ownerId })
  res.json({ rate: rate.lrdToUsd, updatedAt: rate.updatedAt })
})

const updateCurrencyRate = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const rate = Number(req.body.rate)

  if (!rate || Number.isNaN(rate) || rate <= 0) {
    res.status(400)
    throw new Error('Valid rate is required')
  }

  const updated = await currencyRateModel.create({ storeId: scope.storeId, ownerId: scope.ownerId, lrdToUsd: rate })
  res.status(201).json({ rate: updated.lrdToUsd, updatedAt: updated.updatedAt })
})

module.exports = { getCurrencyRate, updateCurrencyRate }
