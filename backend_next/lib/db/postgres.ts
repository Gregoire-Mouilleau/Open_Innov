import { Pool } from 'pg'

declare global {
  var _pgPool: Pool | undefined
}

const pool = globalThis._pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgPool = pool
}

export default pool
