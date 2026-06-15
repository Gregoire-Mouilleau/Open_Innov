import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'

type ServiceStatus = { status: 'ok' | 'error'; message: string }

async function checkPostgres(): Promise<ServiceStatus> {
  try {
    await pool.query('SELECT 1')
    return { status: 'ok', message: 'connected' }
  } catch (e) {
    return { status: 'error', message: (e as Error).message }
  }
}

export async function GET() {
  const postgres = await checkPostgres()
  const allOk = postgres.status === 'ok'

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      services: { postgres },
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  )
}
