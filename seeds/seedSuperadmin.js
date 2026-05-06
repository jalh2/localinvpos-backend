require('dotenv').config()
require('../config')
const userModel = require('../models/userModel')
const storeModel = require('../models/storeModel')
const { hashPassword } = require('../utils/encryption')

const seedSuperadmin = async () => {
  const username = process.env.SUPERADMIN_USERNAME || 'superadmin'
  const existing = await userModel.findByUsername(username)

  if (existing) {
    console.log('Superadmin already exists:', username)
    return existing
  }

  const user = await userModel.create({
    username,
    email: process.env.SUPERADMIN_EMAIL || '',
    password: hashPassword(process.env.SUPERADMIN_PASSWORD || 'change-me'),
    role: 'superadmin',
    displayName: process.env.SUPERADMIN_NAME || 'Super Admin',
    isActive: true
  })

  console.log('Superadmin created:', user.username)
  return user
}

const seedOwnerStore = async () => {
  const ownerUsername = process.env.SEED_OWNER_USERNAME || 'owner'
  const existingOwner = await userModel.findByUsername(ownerUsername)

  if (existingOwner) {
    console.log('Owner already exists:', ownerUsername)
    if (existingOwner.storeId) return existingOwner
  }

  const storeName = process.env.SEED_STORE_NAME || 'Demo Store'
  const baseCurrency = process.env.SEED_STORE_BASE_CURRENCY || 'LRD'
  const exchangeRateUsdToLrd = Number(process.env.SEED_EXCHANGE_RATE_USD_TO_LRD) || 180

  let store = null
  const stores = await storeModel.findAll()
  store = stores.find(item => (item.name || '').toLowerCase() === storeName.toLowerCase())

  if (!store) {
    store = await storeModel.create({
      name: storeName,
      location: process.env.SEED_STORE_LOCATION || 'Monrovia',
      description: process.env.SEED_STORE_DESCRIPTION || 'Demo seeded store',
      phone: process.env.SEED_STORE_PHONE || '',
      baseCurrency,
      exchangeRateUsdToLrd,
      isActive: true
    })
    console.log('Store created:', store.name)
  } else {
    console.log('Store already exists:', store.name)
  }

  const owner = existingOwner || await userModel.create({
    username: ownerUsername,
    email: process.env.SEED_OWNER_EMAIL || 'owner@example.com',
    password: hashPassword(process.env.SEED_OWNER_PASSWORD || 'password'),
    role: 'owner',
    displayName: process.env.SEED_OWNER_NAME || 'Demo Owner',
    phone: process.env.SEED_OWNER_PHONE || '',
    isActive: true,
    storeId: store.id,
    baseCurrency,
    exchangeRateUsdToLrd
  })

  if (!existingOwner) console.log('Owner created:', owner.username)

  if (owner.storeId !== store.id) {
    await userModel.update(owner.id, { storeId: store.id, baseCurrency, exchangeRateUsdToLrd })
    console.log('Owner linked to store:', owner.username, store.name)
  }

  if (store.ownerId !== owner.id) {
    await storeModel.update(store.id, { ownerId: owner.id })
    console.log('Store linked to owner:', store.name, owner.username)
  }

  return owner
}

const seed = async () => {
  await seedSuperadmin()
  await seedOwnerStore()
  console.log('Seed completed')
  process.exit(0)
}

seed().catch(error => {
  console.error(error)
  process.exit(1)
})
