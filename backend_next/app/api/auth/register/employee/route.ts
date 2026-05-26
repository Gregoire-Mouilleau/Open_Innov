import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { hashPassword } from '@/lib/auth/password'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, first_name, last_name, company_id } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'email et password requis' }, { status: 400 })
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rowCount && existing.rowCount > 0) {
    return NextResponse.json({ error: 'email déjà utilisé' }, { status: 409 })
  }

  const password_hash = await hashPassword(password)

  const result = await pool.query<{ id: number; email: string }>(
    `INSERT INTO users (email, first_name, last_name, password_hash, role, company_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'farmer', $5, NOW(), NOW())
     RETURNING id, email`,
    [email, first_name ?? null, last_name ?? null, password_hash, company_id ?? null]
  )

  const user = result.rows[0]
  return NextResponse.json({ user: { id: user.id, email: user.email, role: 'farmer' } }, { status: 201 })
}
