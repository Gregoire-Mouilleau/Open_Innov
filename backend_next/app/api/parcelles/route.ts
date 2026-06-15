import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const farm_id = searchParams.get('farm_id')

  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1', [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id

  const query = farm_id
    ? `SELECT p.*, f.nom AS farm_nom
       FROM parcelle p
       LEFT JOIN farm f ON f.id = p.farm_id
       WHERE p.farm_id = $1 AND f.company_id = $2
       ORDER BY p.created_at DESC`
    : `SELECT p.*, f.nom AS farm_nom
       FROM parcelle p
       LEFT JOIN farm f ON f.id = p.farm_id
       WHERE f.company_id = $1
       ORDER BY p.created_at DESC`

  const result = farm_id
    ? await pool.query(query, [Number(farm_id), companyId])
    : await pool.query(query, [companyId])

  return NextResponse.json({ parcelles: result.rows }, { status: 200 })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const { farm_id, nom, superficie_ha, culture_type, position_lat, position_lng, geometry } = body

  if (!farm_id || !nom) {
    return NextResponse.json({ error: 'farm_id et nom requis' }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO parcelle (farm_id, nom, superficie_ha, culture_type, position_lat, position_lng, geometry, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id, farm_id, nom, superficie_ha, culture_type, position_lat, position_lng, geometry`,
    [farm_id, nom, superficie_ha ?? null, culture_type ?? null, position_lat ?? null, position_lng ?? null,
     geometry ? JSON.stringify(geometry) : null]
  )

  return NextResponse.json({ parcelle: result.rows[0] }, { status: 201 })
}
