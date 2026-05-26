import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const result = await pool.query(
    `SELECT id, email, first_name, last_name, role, company_id, created_at
     FROM users WHERE id = $1`,
    [Number(auth.sub)]
  )

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'utilisateur introuvable' }, { status: 404 })
  }

  return NextResponse.json({ user: result.rows[0] }, { status: 200 })
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const { first_name, last_name, email } = body

  // Vérif unicité email si modifié
  if (email) {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, Number(auth.sub)]
    )
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json({ error: 'cet email est déjà utilisé' }, { status: 409 })
    }
  }

  const result = await pool.query(
    `UPDATE users
     SET first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name),
         email      = COALESCE($3, email),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, email, first_name, last_name, role, company_id`,
    [first_name ?? null, last_name ?? null, email ?? null, Number(auth.sub)]
  )

  return NextResponse.json({ user: result.rows[0] }, { status: 200 })
}
