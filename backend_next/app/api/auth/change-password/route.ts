import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'
import { comparePassword, hashPassword } from '@/lib/auth/password'

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const { current_password, new_password } = body

  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'current_password et new_password requis' }, { status: 400 })
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: 'le nouveau mot de passe doit faire au moins 8 caractères' }, { status: 400 })
  }

  const result = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [Number(auth.sub)]
  )

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'utilisateur introuvable' }, { status: 404 })
  }

  const valid = await comparePassword(current_password, result.rows[0].password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'mot de passe actuel incorrect' }, { status: 401 })
  }

  const newHash = await hashPassword(new_password)
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newHash, Number(auth.sub)]
  )

  return NextResponse.json({ message: 'mot de passe modifié' }, { status: 200 })
}
