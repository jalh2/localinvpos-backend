const storeModel = require('../models/storeModel')

// All store IDs a user can access: assigned stores plus stores they own
const getAccessibleStoreIds = async (user) => {
  if (!user) return []
  const ids = new Set()
  if (user.storeId) ids.add(user.storeId)
  for (const id of user.storeIds || []) {
    if (id) ids.add(id)
  }
  if (user.role === 'owner' || user.role === 'superadmin') {
    const owned = await storeModel.findAll({ ownerId: user.id })
    for (const store of owned) ids.add(store.id)
  }
  return [...ids]
}

const getAccessibleStores = async (user) => {
  const ids = await getAccessibleStoreIds(user)
  const stores = await storeModel.findByIds(ids)
  return stores
    .filter(store => store.isActive !== false)
    .map(store => ({ id: store.id, name: store.name, location: store.location || '' }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

module.exports = { getAccessibleStoreIds, getAccessibleStores }
