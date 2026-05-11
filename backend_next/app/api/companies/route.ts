import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const result = await pool.query(
    'SELECT id, nom, telephone, code_postal, country, created_at FROM company ORDER BY created_at DESC'
  )

  return NextResponse.json({ companies: result.rows }, { status: 200 })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const { nom, telephone, code_postal, country } = body

  if (!nom) {
    return NextResponse.json({ error: 'nom requis' }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO company (nom, telephone, code_postal, country, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, nom, telephone, code_postal, country`,
    [nom, telephone ?? null, code_postal ?? null, country ?? null]
  )

  return NextResponse.json({ company: result.rows[0] }, { status: 201 })
}
