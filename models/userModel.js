const { db } = require('../config')

const collection = db.collection('users')

const defaults = {
  username: '',
  email: '',
  password: '',
  role: 'owner',
  displayName: '',
  phone: '',
  isActive: true,
  storeId: '',
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

const findByUsername = async (username) => {
  const value = String(username || '').trim().toLowerCase()
  if (!value) return null
  const snapshot = await collection.where('username', '==', value).limit(1).get()
  if (snapshot.empty) return null
  return withId(snapshot.docs[0])
}

const create = async (data) => {
  const now = new Date().toISOString()
  const docData = {
    ...defaults,
    ...data,
    username: String(data.username || data.email || '').trim().toLowerCase(),
    email: String(data.email || '').trim().toLowerCase(),
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

const findAll = async ({ role, storeId } = {}) => {
  let q = collection
  if (role) q = q.where('role', '==', role)
  if (storeId) q = q.where('storeId', '==', storeId)
  const snapshot = await q.get()
  return snapshot.docs.map(withId).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

module.exports = { collection, defaults, findById, findByUsername, create, update, remove, findAll }
