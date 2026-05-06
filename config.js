const admin = require('firebase-admin')

const initializeFirebase = () => {
  if (admin.apps.length) return 'existing-app'

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    return 'FIREBASE_SERVICE_ACCOUNT'
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
    return `GOOGLE_APPLICATION_CREDENTIALS=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() })
  return 'application-default'
}

const firebaseCredentialSource = initializeFirebase()

const db = admin.firestore()

const checkFirebaseConnection = async () => {
  try {
    await db.collection('_health').limit(1).get()
    console.log(`[firebase] Connected to Firestore using ${firebaseCredentialSource}`)
    return true
  } catch (error) {
    console.error(`[firebase] Firestore connection failed using ${firebaseCredentialSource}`)
    console.error(`[firebase] ${error.message}`)
    return false
  }
}

module.exports = { admin, db, checkFirebaseConnection, firebaseCredentialSource }
