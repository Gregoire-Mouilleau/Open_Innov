import { MongoClient } from 'mongodb'

declare global {
  var _mongoNativeClient: MongoClient | undefined
}

const client = globalThis._mongoNativeClient ?? new MongoClient(process.env.MONGODB_URI!)

if (process.env.NODE_ENV !== 'production') {
  globalThis._mongoNativeClient = client
}

let _connected = false
export async function getMongoDb() {
  if (!_connected) {
    await client.connect()
    _connected = true
  }
  return client.db(process.env.MONGO_DB)
}

export default client
