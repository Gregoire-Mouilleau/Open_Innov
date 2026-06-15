import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params

  const result = await pool.query(
    `SELECT f.id, f.nom, f.company_id, f.adresse, f.code_postal, f.country, f.created_at,
            c.nom AS company_nom
     FROM farm f
     LEFT JOIN company c ON c.id = f.company_id
     WHERE f.id = $1`,
    [Number(id)]
  )

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'ferme introuvable' }, { status: 404 })
  }

  return NextResponse.json({ farm: result.rows[0] }, { status: 200 })
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { nom, adresse, code_postal, country, company_id } = body

  const result = await pool.query(
    `UPDATE farm
     SET nom        = COALESCE($1, nom),
         adresse    = COALESCE($2, adresse),
         code_postal= COALESCE($3, code_postal),
         country    = COALESCE($4, country),
         company_id = COALESCE($5, company_id)
     WHERE id = $6
     RETURNING id, nom, company_id, adresse, code_postal, country`,
    [nom ?? null, adresse ?? null, code_postal ?? null, country ?? null, company_id ?? null, Number(id)]
  )

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'ferme introuvable' }, { status: 404 })
  }

  return NextResponse.json({ farm: result.rows[0] }, { status: 200 })
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params

  const result = await pool.query('DELETE FROM farm WHERE id = $1 RETURNING id', [Number(id)])

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'ferme introuvable' }, { status: 404 })
  }

  return NextResponse.json({ message: 'ferme supprimée' }, { status: 200 })
}
