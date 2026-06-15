import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

// Marquer une alerte comme lue / non lue
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ error: 'id invalide' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const lu = body?.lu !== undefined ? !!body.lu : true

  const res = await pool.query('UPDATE alerte SET lu = $1 WHERE id = $2', [lu, idNum])

  if (res.rowCount === 0) {
    return NextResponse.json({ error: 'alerte introuvable' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, lu }, { status: 200 })
}
