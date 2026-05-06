const getRequestUser = (req) => {
  if (req.session && req.session.user) return req.session.user

  const id = req.headers['x-user-id']
  const role = req.headers['x-user-role']
  const storeId = req.headers['x-store-id']

  if (!id) return null
  return { id, role: role || 'owner', storeId: storeId || '' }
}

const attachUser = (req, res, next) => {
  req.user = getRequestUser(req)
  next()
}

const requireAuth = (req, res, next) => {
  req.user = getRequestUser(req)
  if (!req.user) {
    res.status(401)
    return next(new Error('Not authorized'))
  }
  next()
}

const requireRole = (...roles) => (req, res, next) => {
  req.user = getRequestUser(req)
  if (!req.user) {
    res.status(401)
    return next(new Error('Not authorized'))
  }
  if (!roles.includes(req.user.role)) {
    res.status(403)
    return next(new Error('Forbidden'))
  }
  next()
}

const getScope = (req) => {
  const user = req.user || getRequestUser(req) || {}
  return {
    userId: user.id || req.query.ownerId || req.body.ownerId || '',
    ownerId: user.role === 'superadmin' ? req.query.ownerId || req.body.ownerId || '' : user.id || '',
    storeId: user.role === 'superadmin' ? req.query.storeId || req.body.storeId || user.storeId || '' : user.storeId || req.query.storeId || req.body.storeId || '',
    role: user.role || 'owner'
  }
}

module.exports = { attachUser, requireAuth, requireRole, getRequestUser, getScope }
