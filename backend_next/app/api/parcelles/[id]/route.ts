import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params

  const [parcelleRes, kitsRes] = await Promise.all([
    pool.query(
      `SELECT p.*, f.nom AS farm_nom
       FROM parcelle p
       LEFT JOIN farm f ON f.id = p.farm_id
       WHERE p.id = $1`,
      [Number(id)]
    ),
    pool.query(
      `SELECT k.id, k.nom, k.modele, k.actif, k.date_installation,
              COUNT(c.id) AS nb_capteurs
       FROM kit k
       LEFT JOIN capteur c ON c.kit_id = k.id
       WHERE k.parcelle_id = $1
       GROUP BY k.id
       ORDER BY k.created_at DESC`,
      [Number(id)]
    ),
  ])

  if (parcelleRes.rowCount === 0) {
    return NextResponse.json({ error: 'parcelle introuvable' }, { status: 404 })
  }

  return NextResponse.json(
    { parcelle: parcelleRes.rows[0], kits: kitsRes.rows },
    { status: 200 }
  )
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params
  const body = await request.json()
  const { nom, superficie_ha, culture_type, position_lat, position_lng, geometry } = body

  const result = await pool.query(
    `UPDATE parcelle
     SET nom           = COALESCE($1, nom),
         superficie_ha = COALESCE($2, superficie_ha),
         culture_type  = COALESCE($3, culture_type),
         position_lat  = COALESCE($4, position_lat),
         position_lng  = COALESCE($5, position_lng),
         geometry      = COALESCE($6, geometry)
     WHERE id = $7
     RETURNING id, nom, superficie_ha, culture_type, position_lat, position_lng, geometry, farm_id`,
    [nom ?? null, superficie_ha ?? null, culture_type ?? null, position_lat ?? null, position_lng ?? null,
     geometry ? JSON.stringify(geometry) : null, Number(id)]
  )

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'parcelle introuvable' }, { status: 404 })
  }

  return NextResponse.json({ parcelle: result.rows[0] }, { status: 200 })
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params

  const result = await pool.query('DELETE FROM parcelle WHERE id = $1 RETURNING id', [Number(id)])

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'parcelle introuvable' }, { status: 404 })
  }

  return NextResponse.json({ message: 'parcelle supprimée' }, { status: 200 })
}
