import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params

  const [kitRes, capteursRes] = await Promise.all([
    pool.query(
      `SELECT k.*, p.nom AS parcelle_nom
       FROM kit k
       LEFT JOIN parcelle p ON p.id = k.parcelle_id
       WHERE k.id = $1`,
      [Number(id)]
    ),
    pool.query(
      `SELECT id, type, unite, actif FROM capteur WHERE kit_id = $1 ORDER BY id`,
      [Number(id)]
    ),
  ])

  if (kitRes.rowCount === 0) {
    return NextResponse.json({ error: 'kit introuvable' }, { status: 404 })
  }

  return NextResponse.json(
    { kit: kitRes.rows[0], capteurs: capteursRes.rows },
    { status: 200 }
  )
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { nom, modele, actif, date_installation } = body

  const result = await pool.query(
    `UPDATE kit
     SET nom              = COALESCE($1, nom),
         modele           = COALESCE($2, modele),
         actif            = COALESCE($3, actif),
         date_installation= COALESCE($4, date_installation)
     WHERE id = $5
     RETURNING id, parcelle_id, nom, modele, actif, date_installation`,
    [nom ?? null, modele ?? null, actif ?? null, date_installation ?? null, Number(id)]
  )

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'kit introuvable' }, { status: 404 })
  }

  return NextResponse.json({ kit: result.rows[0] }, { status: 200 })
}
