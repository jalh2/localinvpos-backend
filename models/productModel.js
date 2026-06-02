const { db, admin } = require('../config')

const collection = db.collection('products')

const defaults = {
  storeId: '',
  ownerId: '',
  itemID: '',
  productName: '',
  category: '',
  brand: '',
  quantityInStock: 0,
  unitCost: 0,
  unitCostCurrency: 'LRD',
  sellingPriceLRD: 0,
  sellingPriceUSD: 0,
  wholesalePriceLRD: 0,
  wholesalePriceUSD: 0,
  productType: 'retail', // 'retail' or 'wholesale'
  restockLevel: 0,
  warningLimit: 0,
  supplier: '',
  notes: '',
  barcode: '',
  image: '',
  storageLocation: '',
  expirationDate: '',
  createdAt: null,
  updatedAt: null
}

const withId = doc => ({ id: doc.id, ...doc.data() })

const findById = async (id) => {
  const doc = await collection.doc(id).get()
  if (!doc.exists) return null
  return withId(doc)
}

const findByItemID = async (storeId, itemID) => {
  if (!storeId || !itemID) return null
  const snapshot = await collection.where('storeId', '==', storeId).where('itemID', '==', itemID).limit(1).get()
  if (snapshot.empty) return null
  return withId(snapshot.docs[0])
}

const create = async (data) => {
  const now = new Date().toISOString()
  const quantity = Number(data.quantityInStock) || 0
  const docData = {
    ...defaults,
    ...data,
    quantityInStock: quantity,
    unitCost: Number(data.unitCost) || 0,
    unitCostCurrency: data.unitCostCurrency || 'LRD',
    sellingPriceLRD: Number(data.sellingPriceLRD) || 0,
    sellingPriceUSD: Number(data.sellingPriceUSD) || 0,
    wholesalePriceLRD: Number(data.wholesalePriceLRD) || 0,
    wholesalePriceUSD: Number(data.wholesalePriceUSD) || 0,
    productType: data.productType === 'wholesale' ? 'wholesale' : 'retail',
    restockLevel: Number(data.restockLevel) || 0,
    warningLimit: Number(data.warningLimit) || 0,
    createdAt: now,
    updatedAt: now
  }
  const ref = await collection.add(docData)
  return { id: ref.id, ...docData }
}

const update = async (id, data) => {
  await collection.doc(id).update({ ...data, updatedAt: new Date().toISOString() })
  return findById(id)
}

const remove = async (id) => {
  await collection.doc(id).delete()
  return { success: true }
}

const findAll = async ({ storeId, ownerId, lowStock } = {}) => {
  let q = collection
  if (storeId) q = q.where('storeId', '==', storeId)
  if (ownerId) q = q.where('ownerId', '==', ownerId)
  const snapshot = await q.get()
  let products = snapshot.docs.map(withId).sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))
  if (lowStock) products = products.filter(product => Number(product.quantityInStock) <= Number(product.restockLevel))
  return products
}

const adjustQuantity = async (id, delta) => {
  await collection.doc(id).update({ quantityInStock: admin.firestore.FieldValue.increment(Number(delta) || 0), updatedAt: new Date().toISOString() })
  return findById(id)
}

module.exports = { collection, defaults, findById, findByItemID, create, update, remove, findAll, adjustQuantity }
