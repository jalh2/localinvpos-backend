const { db } = require('../config')

const collection = db.collection('credits')

const defaults = {
  storeId: '',
  ownerId: '',
  occurredAt: null,
  customerName: '',
  status: 'pending',
  preferredCurrency: 'LRD',
  productsSold: [],
  totalLRD: 0,
  totalUSD: 0,
  paidAt: null,
  transactionId: '',
  paymentTransactionId: '',
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

const findAll = async ({ storeId, ownerId, status, customerName } = {}) => {
  let q = collection
  if (storeId) q = q.where('storeId', '==', storeId)
  if (ownerId) q = q.where('ownerId', '==', ownerId)
  if (status) q = q.where('status', '==', status)
  const snapshot = await q.get()
  let credits = snapshot.docs.map(withId).sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || ''))
  if (customerName) credits = credits.filter(credit => String(credit.customerName || '').toLowerCase().includes(String(customerName).toLowerCase()))
  return credits
}

module.exports = { collection, defaults, findById, create, update, remove, findAll }
