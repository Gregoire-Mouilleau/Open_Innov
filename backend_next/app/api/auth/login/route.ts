import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { comparePassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/token'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'email et password requis' }, { status: 400 })
  }

  const result = await pool.query<{
    id: number
    email: string
    password_hash: string
    role: string
  }>(
    'SELECT id, email, password_hash, role FROM users WHERE email = $1',
    [email]
  )

  const user = result.rows[0]

  if (!user || !(await comparePassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'identifiants invalides' }, { status: 401 })
  }

  const payload = { sub: String(user.id), email: user.email, isAdmin: user.role === 'admin' }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken({ sub: payload.sub }),
  ])

  const response = NextResponse.json(
    { user: { id: user.id, email: user.email, role: user.role }, accessToken },
    { status: 200 }
  )

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/api/auth/refresh',
  })

  return response
}
