import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1', [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id

  const result = await pool.query(
    `SELECT id, email, first_name, last_name, role, company_id, created_at
     FROM users
     WHERE company_id = $1
     ORDER BY created_at DESC`,
    [companyId]
  )

  return NextResponse.json({ users: result.rows }, { status: 200 })
}
