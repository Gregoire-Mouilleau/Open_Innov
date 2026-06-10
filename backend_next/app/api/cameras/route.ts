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

  const result = farmId
    ? await pool.query(
        `SELECT c.id, c.farm_id, c.nom, c.emplacement, c.url, c.thumbnail, c.icon, c.statut
         FROM camera c
         JOIN farm f ON f.id = c.farm_id
         WHERE f.company_id = $1 AND c.farm_id = $2
         ORDER BY c.id`,
        [companyId, Number(farmId)]
      )
    : await pool.query(
        `SELECT c.id, c.farm_id, c.nom, c.emplacement, c.url, c.thumbnail, c.icon, c.statut
         FROM camera c
         LEFT JOIN farm f ON f.id = c.farm_id
         WHERE f.company_id = $1
         ORDER BY c.id`,
        [companyId]
      )

  return NextResponse.json({ cameras: result.rows }, { status: 200 })
}
