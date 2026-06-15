import { MongoClient } from 'mongodb'

declare global {
  var _mongoNativeClient: MongoClient | undefined
}

// Création paresseuse : le client n'est instancié qu'au premier appel (runtime),
// jamais à l'import. Sinon `new MongoClient(undefined)` plante `next build`.
function getClient(): MongoClient {
  if (!globalThis._mongoNativeClient) {
    globalThis._mongoNativeClient = new MongoClient(process.env.MONGODB_URI!)
  }
  return globalThis._mongoNativeClient
}

let _connected = false
export async function getMongoDb() {
  const client = getClient()
  if (!_connected) {
    await client.connect()
    _connected = true
  }
  return client.db(process.env.MONGO_DB)
}
