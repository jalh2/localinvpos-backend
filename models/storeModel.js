const { db } = require('../config')

const collection = db.collection('stores')

const defaults = {
  ownerId: '',
  name: '',
  location: '',
  description: '',
  phone: '',
  isActive: true,
  baseCurrency: 'LRD',
  exchangeRateUsdToLrd: 180,
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
  const docData = { ...defaults, ...data, createdAt: now, updatedAt: now }
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

const findAll = async ({ ownerId, isActive } = {}) => {
  let q = collection
  if (ownerId) q = q.where('ownerId', '==', ownerId)
  if (typeof isActive === 'boolean') q = q.where('isActive', '==', isActive)
  const snapshot = await q.get()
  return snapshot.docs.map(withId).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

module.exports = { collection, defaults, findById, create, update, remove, findAll }
