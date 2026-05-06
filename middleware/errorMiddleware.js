const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500
  const user = req.user ? `${req.user.role || 'unknown'}:${req.user.id || 'unknown'}` : 'anonymous'

  console.error(`[api:error] ${statusCode} ${req.method} ${req.originalUrl} user=${user}`)
  console.error(`[api:error] ${err.message || 'Server error'}`)
  if (err.stack && process.env.NODE_ENV !== 'production') console.error(err.stack)

  res.status(statusCode).json({ message: err.message || 'Server error' })
}

module.exports = { notFound, errorHandler }
