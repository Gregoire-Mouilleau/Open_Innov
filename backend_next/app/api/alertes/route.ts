import { NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/db/mongoNative'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const severite  = searchParams.get('severite') // 'info' | 'warning' | 'critical'
  const lu        = searchParams.get('lu')        // 'true' | 'false'
  const parcelleId = searchParams.get('parcelle_id')

  const db = await getMongoDb()
  const col = db.collection('alertes')

  const filter: Record<string, unknown> = {}
  if (severite)   filter.severite    = { $in: severite.split(',') }
  if (lu !== null && lu !== undefined) filter.lu = lu === 'true'
  if (parcelleId) filter.parcelle_id = parseInt(parcelleId)

  const alertes = await col
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  return NextResponse.json({ alertes }, { status: 200 })
}
