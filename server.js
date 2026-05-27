require('dotenv').config()
const express = require('express')
const cors = require('cors')
const session = require('express-session')
const { checkFirebaseConnection, firebaseCredentialSource } = require('./config')
const { attachUser } = require('./middleware/auth')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

const userRoutes = require('./routes/userRoutes')
const adminRoutes = require('./routes/adminRoutes')
const storeUserRoutes = require('./routes/storeUserRoutes')
const productRoutes = require('./routes/productRoutes')
const transactionRoutes = require('./routes/transactionRoutes')
const creditRoutes = require('./routes/creditRoutes')
const reportRoutes = require('./routes/reportRoutes')
const currencyRateRoutes = require('./routes/currencyRateRoutes')

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.set('trust proxy', 1)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use(session({
  secret: process.env.SESSION_SECRET || 'localinventorypos_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30
  }
}))

app.use(attachUser)

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Local Inventory POS Backend API' })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is healthy' })
})

app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/store-users', storeUserRoutes)
app.use('/api/products', productRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/credits', creditRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/currency-rate', currencyRateRoutes)

app.use(notFound)
app.use(errorHandler)

const port = process.env.PORT || 5000

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
    console.log(`[firebase] Initialized with ${firebaseCredentialSource}`)
    checkFirebaseConnection()
  })
}

module.exports = app
