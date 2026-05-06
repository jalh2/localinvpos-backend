const { db } = require('../config')

const collection = db.collection('transactions')

const defaults = {
  storeId: '',
  ownerId: '',
  occurredAt: null,
  type: 'sale',
  currency: 'LRD',
  paymentMethod: 'Cash',
  customerName: '',
  creditId: '',
  productsSold: [],
  discountType: 'none',
  discountValue: 0,
  discountAmount: 0,
  subtotalLRD: 0,
  subtotalUSD: 0,
  amountReceivedLRD: 0,
  amountReceivedUSD: 0,
  change: 0,
  changeCurrency: 'LRD',
  totalLRD: 0,
  totalUSD: 0,
  createdAt: null,
  updatedAt: null
}

const withId = doc => ({ id: doc.id, ...doc.data() })

const findById = async (id) => {
  const doc = await collection.doc(id).get()
  if (!doc.exists) return null
  return withId(doc)
}

const create = async (data) => {
  const now = new Date().toISOString()
  const docData = { ...defaults, ...data, occurredAt: data.occurredAt || data.date || now, createdAt: now, updatedAt: now }
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

const findAll = async ({ storeId, ownerId, type, creditId } = {}) => {
  let q = collection
  if (storeId) q = q.where('storeId', '==', storeId)
  if (ownerId) q = q.where('ownerId', '==', ownerId)
  if (type) q = q.where('type', '==', type)
  if (creditId) q = q.where('creditId', '==', creditId)
  const snapshot = await q.get()
  return snapshot.docs.map(withId).sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || ''))
}

module.exports = { collection, defaults, findById, create, update, remove, findAll }
