import { Client } from 'minio'

declare global {
  var _minioClient: Client | undefined
}

const client = globalThis._minioClient ?? new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
})

if (process.env.NODE_ENV !== 'production') {
  globalThis._minioClient = client
}

export default client
