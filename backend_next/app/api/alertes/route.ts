import { NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/db/mongoNative'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const limit      = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const severite   = searchParams.get('severite')
  const lu         = searchParams.get('lu')
  const parcelleId = searchParams.get('parcelle_id')

  // Récupérer les IDs de parcelles appartenant à l'entreprise du user
  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1', [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id

  const parcellesRes = await pool.query<{ id: number }>(
    `SELECT p.id FROM parcelle p
     LEFT JOIN farm f ON f.id = p.farm_id
     WHERE f.company_id = $1`,
    [companyId]
  )
  const companyParcelleIds = parcellesRes.rows.map(r => r.id)

  const db = await getMongoDb()
  const col = db.collection('alertes')

  const filter: Record<string, unknown> = {
    parcelle_id: { $in: parcelleId ? [parseInt(parcelleId)] : companyParcelleIds },
  }
  if (severite) filter.severite = { $in: severite.split(',') }
  if (lu !== null && lu !== undefined) filter.lu = lu === 'true'

  const alertes = await col
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  return NextResponse.json({ alertes }, { status: 200 })
}
