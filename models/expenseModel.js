const { db } = require('../config')

const collection = db.collection('expenses')

const defaults = {
  storeId: '',
  ownerId: '',
  description: '',
  amount: 0,
  currency: 'LRD',
  category: '',
  note: '',
  occurredAt: null,
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
  const docData = {
    ...defaults,
    ...data,
    amount: Number(data.amount) || 0,
    occurredAt: data.occurredAt || now,
    createdAt: now,
    updatedAt: now
  }
  const ref = await collection.add(docData)
  return { id: ref.id, ...docData }
}

const update = async (id, data) => {
  const now = new Date().toISOString()
  const updateData = { ...data, updatedAt: now }
  if (data.amount !== undefined) updateData.amount = Number(data.amount) || 0
  await collection.doc(id).update(updateData)
  return findById(id)
}

const remove = async (id) => {
  await collection.doc(id).delete()
  return { success: true }
}

const findAll = async ({ storeId, ownerId } = {}) => {
  let q = collection
  if (storeId) q = q.where('storeId', '==', storeId)
  if (ownerId) q = q.where('ownerId', '==', ownerId)
  const snapshot = await q.get()
  return snapshot.docs
    .map(withId)
    .sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || ''))
}

module.exports = { collection, defaults, findById, create, update, remove, findAll }
