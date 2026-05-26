import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const result = await pool.query(
    `SELECT f.id, f.nom, f.company_id, f.adresse, f.code_postal, f.country, f.created_at,
            c.nom AS company_nom
     FROM farm f
     LEFT JOIN company c ON c.id = f.company_id
     ORDER BY f.created_at DESC`
  )

  return NextResponse.json({ farms: result.rows }, { status: 200 })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const { nom, company_id, adresse, code_postal, country, latitude, longitude } = body

  if (!nom || !company_id) {
    return NextResponse.json({ error: 'nom et company_id requis' }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO farm (nom, company_id, adresse, code_postal, country, latitude, longitude, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id, nom, company_id, adresse, code_postal, country, latitude, longitude`,
    [nom, company_id, adresse ?? null, code_postal ?? null, country ?? null, latitude ?? null, longitude ?? null]
  )

  return NextResponse.json({ farm: result.rows[0] }, { status: 201 })
}
