import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const result = await pool.query(
    `SELECT id, email, first_name, last_name, role, company_id, created_at
     FROM users
     ORDER BY created_at DESC`
  )

  return NextResponse.json({ users: result.rows }, { status: 200 })
}
