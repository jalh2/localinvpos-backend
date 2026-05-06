const makeItemId = (prefix = 'ITEM') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

module.exports = { makeItemId }
