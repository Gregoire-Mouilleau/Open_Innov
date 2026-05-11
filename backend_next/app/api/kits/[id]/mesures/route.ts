import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params
  const { searchParams } = new URL(request.url)

  const capteur_id = searchParams.get('capteur_id')
  const mode = searchParams.get('mode') ?? 'raw'
  const from = searchParams.get('from') ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const to = searchParams.get('to') ?? new Date().toISOString()
  const interval = searchParams.get('interval') ?? '1 hour'

  // Vérifie que le kit existe
  const kitCheck = await pool.query('SELECT id FROM kit WHERE id = $1', [Number(id)])
  if (kitCheck.rowCount === 0) {
    return NextResponse.json({ error: 'kit introuvable' }, { status: 404 })
  }

  if (mode === 'graph') {
    // Données agrégées via time_bucket (TimescaleDB) pour les graphiques
    const capteurFilter = capteur_id ? 'AND m.capteur_id = $4' : ''
    const queryParams = capteur_id
      ? [interval, from, to, Number(capteur_id), Number(id)]
      : [interval, from, to, Number(id)]

    const idParam = capteur_id ? '$5' : '$4'

    const result = await pool.query(
      `SELECT time_bucket($1::interval, m.time) AS bucket,
              c.type,
              c.unite,
              AVG(m.valeur)::numeric(10,4) AS moyenne,
              MIN(m.valeur)::numeric(10,4) AS min,
              MAX(m.valeur)::numeric(10,4) AS max
       FROM mesure m
       JOIN capteur c ON c.id = m.capteur_id
       WHERE c.kit_id = ${idParam}
         AND m.time BETWEEN $2 AND $3
         ${capteurFilter}
       GROUP BY bucket, c.type, c.unite
       ORDER BY bucket ASC`,
      queryParams
    )

    return NextResponse.json({ mode: 'graph', interval, from, to, data: result.rows }, { status: 200 })
  }

  // Mode raw : dernières mesures par capteur
  const capteurFilter = capteur_id ? 'AND m.capteur_id = $4' : ''
  const queryParams = capteur_id
    ? [from, to, Number(id), Number(capteur_id)]
    : [from, to, Number(id)]

  const result = await pool.query(
    `SELECT m.time, m.valeur, m.qualite, c.id AS capteur_id, c.type, c.unite
     FROM mesure m
     JOIN capteur c ON c.id = m.capteur_id
     WHERE c.kit_id = $3
       AND m.time BETWEEN $1 AND $2
       ${capteurFilter}
     ORDER BY m.time DESC
     LIMIT 500`,
    queryParams
  )

  return NextResponse.json({ mode: 'raw', from, to, data: result.rows }, { status: 200 })
}
