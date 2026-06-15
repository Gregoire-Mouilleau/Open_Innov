import mongoose from 'mongoose'

declare global {
  var _mongoConn: Promise<typeof mongoose> | undefined
}

// Connexion paresseuse : `mongoose.connect` n'est lancé qu'au premier appel
// (runtime), jamais à l'import — sinon `next build` plante (MONGODB_URI absente).
export default function mongoConnect(): Promise<typeof mongoose> {
  if (!globalThis._mongoConn) {
    globalThis._mongoConn = mongoose.connect(process.env.MONGODB_URI!)
  }
  return globalThis._mongoConn
}
