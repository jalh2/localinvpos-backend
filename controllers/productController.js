const asyncHandler = require('express-async-handler')
const productModel = require('../models/productModel')
const { getScope } = require('../middleware/auth')
const { makeItemId } = require('../utils/ids')

const listProducts = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const products = await productModel.findAll({ storeId: scope.storeId, ownerId: scope.ownerId, lowStock: req.query.lowStock })
  res.json(products)
})

const createProduct = asyncHandler(async (req, res) => {
  const scope = getScope(req)
  const itemID = req.body.itemID || makeItemId('SKU')
  const existing = await productModel.findByItemID(scope.storeId || req.body.storeId, itemID)
  if (existing) {
    res.status(400)
    throw new Error('Product itemID already exists for this store')
  }

  const product = await productModel.create({ ...req.body, itemID, storeId: scope.storeId || req.body.storeId, ownerId: scope.ownerId || req.body.ownerId })
  res.status(201).json(product)
})

const getProduct = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id)
  if (!product) {
    res.status(404)
    throw new Error('Product not found')
  }
  res.json(product)
})

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productModel.update(req.params.id, req.body)
  res.json(product)
})

const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productModel.remove(req.params.id)
  res.json(result)
})

const restockProduct = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity) || 0
  const product = await productModel.adjustQuantity(req.params.id, quantity)
  res.json(product)
})

module.exports = { listProducts, createProduct, getProduct, updateProduct, deleteProduct, restockProduct }
