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
  const { email, password, first_name, last_name, company_id, company_role_id } = body

  if (!email) {
    return NextResponse.json({ error: 'email requis' }, { status: 400 })
  }

  const targetCompanyId: number | null = company_id ?? null

  // Résoudre le rôle string depuis company_role si fourni
  let targetRole = 'farmer'
  let targetRoleId: number | null = company_role_id ?? null
  if (targetRoleId != null) {
    const crRes = await pool.query<{ base_role: string }>(
      'SELECT base_role FROM company_role WHERE id = $1',
      [targetRoleId]
    )
    if (crRes.rowCount === 0) {
      return NextResponse.json({ error: 'rôle introuvable' }, { status: 404 })
    }
    targetRole = crRes.rows[0].base_role
  }

  const existing = await pool.query<{
    id: number; email: string; first_name: string | null; last_name: string | null;
    role: string; company_id: number | null
  }>('SELECT id, email, first_name, last_name, role, company_id FROM users WHERE email = $1', [email])

  if (existing.rowCount && existing.rowCount > 0) {
    const existingUser = existing.rows[0]

    if (existingUser.company_id !== null && existingUser.company_id === targetCompanyId) {
      return NextResponse.json({ error: 'Cet utilisateur est déjà membre de cette organisation' }, { status: 409 })
    }

    if (existingUser.company_id !== null && existingUser.company_id !== targetCompanyId) {
      return NextResponse.json({ error: 'Cet utilisateur appartient déjà à une autre organisation' }, { status: 409 })
    }

    const updated = await pool.query<{ id: number; email: string; role: string }>(
      `UPDATE users
       SET company_id      = $1,
           role            = $2,
           company_role_id = $3,
           first_name      = COALESCE($4, first_name),
           last_name       = COALESCE($5, last_name),
           updated_at      = NOW()
       WHERE id = $6
       RETURNING id, email, role`,
      [targetCompanyId, targetRole, targetRoleId, first_name ?? null, last_name ?? null, existingUser.id]
    )

    const user = updated.rows[0]
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role }, linked: true }, { status: 200 })
  }

  if (!password) {
    return NextResponse.json({ error: 'password requis pour un nouvel utilisateur' }, { status: 400 })
  }

  const password_hash = await hashPassword(password)

  const result = await pool.query<{ id: number; email: string }>(
    `INSERT INTO users (email, first_name, last_name, password_hash, role, company_id, company_role_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id, email`,
    [email, first_name ?? null, last_name ?? null, password_hash, targetRole, targetCompanyId, targetRoleId]
  )

  const user = result.rows[0]
  return NextResponse.json({ user: { id: user.id, email: user.email, role: targetRole }, linked: false }, { status: 201 })
}
