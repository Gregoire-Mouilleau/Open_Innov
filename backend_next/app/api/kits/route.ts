import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const parcelle_id = searchParams.get('parcelle_id')

  const query = parcelle_id
    ? `SELECT k.*, p.nom AS parcelle_nom, COUNT(c.id) AS nb_capteurs
       FROM kit k
       LEFT JOIN parcelle p ON p.id = k.parcelle_id
       LEFT JOIN capteur c ON c.kit_id = k.id
       WHERE k.parcelle_id = $1
       GROUP BY k.id, p.nom
       ORDER BY k.created_at DESC`
    : `SELECT k.*, p.nom AS parcelle_nom, COUNT(c.id) AS nb_capteurs
       FROM kit k
       LEFT JOIN parcelle p ON p.id = k.parcelle_id
       LEFT JOIN capteur c ON c.kit_id = k.id
       GROUP BY k.id, p.nom
       ORDER BY k.created_at DESC`

  const result = parcelle_id
    ? await pool.query(query, [Number(parcelle_id)])
    : await pool.query(query)

  return NextResponse.json({ kits: result.rows }, { status: 200 })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const { parcelle_id, nom, modele, date_installation } = body

  if (!parcelle_id) {
    return NextResponse.json({ error: 'parcelle_id requis' }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO kit (parcelle_id, nom, modele, date_installation, actif, created_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     RETURNING id, parcelle_id, nom, modele, actif, date_installation`,
    [parcelle_id, nom ?? null, modele ?? null, date_installation ?? null]
  )

  return NextResponse.json({ kit: result.rows[0] }, { status: 201 })
}
