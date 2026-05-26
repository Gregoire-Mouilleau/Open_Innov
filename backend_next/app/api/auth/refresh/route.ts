import { NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken } from '@/lib/auth/token'
import pool from '@/lib/db/postgres'

export async function POST(request: Request) {
  const refreshToken = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('refresh_token='))
    ?.split('=')[1]

  if (!refreshToken) {
    return NextResponse.json({ error: 'refresh token manquant' }, { status: 401 })
  }

  let payload: { sub: string }
  try {
    payload = await verifyRefreshToken(refreshToken)
  } catch {
    return NextResponse.json({ error: 'refresh token invalide ou expiré' }, { status: 401 })
  }

  const result = await pool.query<{ id: number; email: string; role: string }>(
    'SELECT id, email, role FROM users WHERE id = $1',
    [Number(payload.sub)]
  )

  const user = result.rows[0]
  if (!user) {
    return NextResponse.json({ error: 'utilisateur introuvable' }, { status: 401 })
  }

  const accessToken = await signAccessToken({
    sub: String(user.id),
    email: user.email,
    isAdmin: user.role === 'admin',
  })

  return NextResponse.json({ accessToken }, { status: 200 })
}
