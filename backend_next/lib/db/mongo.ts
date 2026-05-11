import mongoose from 'mongoose'

declare global {
  var _mongoConn: Promise<typeof mongoose> | undefined
}

const MONGODB_URI = process.env.MONGODB_URI!

const connect = globalThis._mongoConn ?? mongoose.connect(MONGODB_URI)

if (process.env.NODE_ENV !== 'production') {
  globalThis._mongoConn = connect
}

export default connect
