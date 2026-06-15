import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import mongoConnect from '@/lib/db/mongo'
import minioClient from '@/lib/db/minio'

type ServiceStatus = { status: 'ok' | 'error'; message: string }

async function checkPostgres(): Promise<ServiceStatus> {
  try {
    await pool.query('SELECT 1')
    return { status: 'ok', message: 'connected' }
  } catch (e) {
    return { status: 'error', message: (e as Error).message }
  }
}

async function checkMongo(): Promise<ServiceStatus> {
  try {
    const mongoose = await mongoConnect()
    const state = mongoose.connection.readyState
    if (state === 1) return { status: 'ok', message: 'connected' }
    return { status: 'error', message: `readyState=${state}` }
  } catch (e) {
    return { status: 'error', message: (e as Error).message }
  }
}

async function checkMinio(): Promise<ServiceStatus> {
  try {
    await minioClient.listBuckets()
    return { status: 'ok', message: 'connected' }
  } catch (e) {
    return { status: 'error', message: (e as Error).message }
  }
}

export async function GET() {
  const [postgres, mongo, minio] = await Promise.all([
    checkPostgres(),
    checkMongo(),
    checkMinio(),
  ])

  const allOk = [postgres, mongo, minio].every(s => s.status === 'ok')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      services: { postgres, mongo, minio },
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  )
}
