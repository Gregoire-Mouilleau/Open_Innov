import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const farmId = searchParams.get('farm_id')

  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1',
    [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id

  const base = `
    SELECT c.id, c.type, c.unite, c.actif, c.position_lat, c.position_lng,
           p.id AS parcelle_id, p.nom AS parcelle_nom
    FROM capteur c
    JOIN kit k      ON k.id = c.kit_id
    JOIN parcelle p ON p.id = k.parcelle_id
    JOIN farm f     ON f.id = p.farm_id
    WHERE f.company_id = $1`

  const result = farmId
    ? await pool.query(base + ' AND f.id = $2 ORDER BY c.id', [companyId, Number(farmId)])
    : await pool.query(base + ' ORDER BY c.id', [companyId])

  return NextResponse.json({ capteurs: result.rows }, { status: 200 })
}
