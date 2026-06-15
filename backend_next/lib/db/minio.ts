import { Client } from 'minio'

declare global {
  var _minioClient: Client | undefined
}

function createClient(): Client {
  return new Client({
    endPoint: process.env.MINIO_ENDPOINT!,
    port: Number(process.env.MINIO_PORT),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  })
}

function getClient(): Client {
  if (!globalThis._minioClient) globalThis._minioClient = createClient()
  return globalThis._minioClient
}

// Proxy : le vrai client MinIO n'est instancié qu'au PREMIER accès (au runtime,
// quand les variables d'env sont présentes) et jamais à l'import du module.
// Sans ça, `new Client({...})` au top-level plante `next build` (env absentes).
const client = new Proxy({} as Client, {
  get(_target, prop) {
    const real = getClient() as unknown as Record<string | symbol, unknown>
    const value = real[prop]
    return typeof value === 'function' ? value.bind(real) : value
  },
})

export default client
