import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { hashPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/token'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, first_name, last_name } = body

  if (!email || !password) return NextResponse.json({ error: 'email et password requis' }, { status: 400 })

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rowCount && existing.rowCount > 0) {
    return NextResponse.json({ error: 'email déjà utilisé' }, { status: 409 })
  }

  const password_hash = await hashPassword(password)

  try {
    const userRes = await pool.query<{ id: number; email: string }>(
      `INSERT INTO users (email, first_name, last_name, password_hash, role, company_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'gerant', NULL, NOW(), NOW())
       RETURNING id, email`,
      [email, first_name ?? null, last_name ?? null, password_hash]
    )

    const user = userRes.rows[0]
    const payload = { sub: String(user.id), email: user.email, isAdmin: true, role: 'gerant' }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken({ sub: payload.sub }),
    ])

    const response = NextResponse.json(
      { user: { id: user.id, email: user.email, company_id: null }, accessToken },
      { status: 201 }
    )

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/api/auth/refresh',
    })

    return response
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Erreur serveur lors de la création du compte' }, { status: 500 })
  }
}
