import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { nom, telephone, code_postal, country } = body

  const result = await pool.query(
    `UPDATE company
     SET nom        = COALESCE($1, nom),
         telephone  = COALESCE($2, telephone),
         code_postal= COALESCE($3, code_postal),
         country    = COALESCE($4, country)
     WHERE id = $5
     RETURNING id, nom, telephone, code_postal, country`,
    [nom ?? null, telephone ?? null, code_postal ?? null, country ?? null, Number(id)]
  )

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'company introuvable' }, { status: 404 })
  }

  return NextResponse.json({ company: result.rows[0] }, { status: 200 })
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params

  const result = await pool.query('DELETE FROM company WHERE id = $1 RETURNING id', [Number(id)])

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'company introuvable' }, { status: 404 })
  }

  return NextResponse.json({ message: 'company supprimée' }, { status: 200 })
}
