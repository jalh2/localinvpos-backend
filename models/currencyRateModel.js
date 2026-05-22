const { db } = require('../config')

const collection = db.collection('currencyRates')
const DEFAULT_RATE = 197

const withId = doc => ({ id: doc.id, ...doc.data() })

const getCurrent = async ({ storeId, ownerId } = {}) => {
  let q = collection
  if (storeId) q = q.where('storeId', '==', storeId)
  if (ownerId) q = q.where('ownerId', '==', ownerId)
  const snapshot = await q.get()
  const rates = snapshot.docs.map(withId).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  if (rates[0]) return rates[0]
  return create({ storeId, ownerId, lrdToUsd: DEFAULT_RATE })
}

const create = async ({ storeId = '', ownerId = '', lrdToUsd = DEFAULT_RATE } = {}) => {
  const now = new Date().toISOString()
  const docData = {
    storeId,
    ownerId,
    lrdToUsd: Number(lrdToUsd) || DEFAULT_RATE,
    createdAt: now,
    updatedAt: now
  }
  const ref = await collection.add(docData)
  return { id: ref.id, ...docData }
}

module.exports = { DEFAULT_RATE, collection, getCurrent, create }
