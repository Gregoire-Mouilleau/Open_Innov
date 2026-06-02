import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1', [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id

  const result = await pool.query(
    `SELECT f.id, f.nom, f.company_id, f.adresse, f.code_postal, f.country,
            f.latitude, f.longitude, f.created_at, c.nom AS company_nom
     FROM farm f
     LEFT JOIN company c ON c.id = f.company_id
     WHERE f.company_id = $1
     ORDER BY f.created_at DESC`,
    [companyId]
  )

  return NextResponse.json({ farms: result.rows }, { status: 200 })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const { nom, company_id, adresse, code_postal, country, latitude, longitude, parcelles } = body

  if (!nom || !company_id) {
    return NextResponse.json({ error: 'nom et company_id requis' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Créer la ferme
    const farmRes = await client.query(
      `INSERT INTO farm (nom, company_id, adresse, code_postal, country, latitude, longitude, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, nom, company_id, adresse, code_postal, country, latitude, longitude`,
      [nom, company_id, adresse ?? null, code_postal ?? null, country ?? null, latitude ?? null, longitude ?? null]
    )
    const farm = farmRes.rows[0]

    // Créer les parcelles si fournies (depuis la carte)
    let parcellesCreated = 0
    if (Array.isArray(parcelles) && parcelles.length > 0) {
      for (const p of parcelles) {
        await client.query(
          `INSERT INTO parcelle (farm_id, nom, position_lat, position_lng, geometry, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [farm.id, p.nom ?? 'Parcelle', p.position_lat ?? null, p.position_lng ?? null,
           p.latlngs ? JSON.stringify(p.latlngs) : null]
        )
        parcellesCreated++
      }
    }

    await client.query('COMMIT')
    return NextResponse.json({ farm: { ...farm, parcelles_count: parcellesCreated } }, { status: 201 })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[POST /api/farms]', err)
    return NextResponse.json({ error: 'Erreur création ferme' }, { status: 500 })
  } finally {
    client.release()
  }
}
