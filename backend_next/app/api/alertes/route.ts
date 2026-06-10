import { NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/db/mongoNative'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const limit      = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const severite   = searchParams.get('severite')
  const lu         = searchParams.get('lu')
  const parcelleId = searchParams.get('parcelle_id')

  // Récupérer les IDs de parcelles appartenant à l'entreprise du user
  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1', [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id

  const parcellesRes = await pool.query<{ id: number; parcelle_nom: string; ferme_nom: string }>(
    `SELECT p.id, p.nom AS parcelle_nom, f.nom AS ferme_nom
     FROM parcelle p
     LEFT JOIN farm f ON f.id = p.farm_id
     WHERE f.company_id = $1`,
    [companyId]
  )
  const companyParcelleIds = parcellesRes.rows.map(r => r.id)
  const parcelleMap = new Map(parcellesRes.rows.map(r => [r.id, { parcelle_nom: r.parcelle_nom, ferme_nom: r.ferme_nom }]))

  // Capteurs de l'entreprise (pour résoudre capteur_id → type)
  const capteursRes = await pool.query<{ id: number; type: string }>(
    `SELECT c.id, c.type
     FROM capteur c
     JOIN kit k      ON k.id = c.kit_id
     JOIN parcelle p ON p.id = k.parcelle_id
     JOIN farm f     ON f.id = p.farm_id
     WHERE f.company_id = $1`,
    [companyId]
  )
  const capteurMap = new Map(capteursRes.rows.map(r => [r.id, r.type]))

  const db = await getMongoDb()
  const col = db.collection('alertes')

  const filter: Record<string, unknown> = {
    parcelle_id: { $in: parcelleId ? [parseInt(parcelleId)] : companyParcelleIds },
  }
  if (severite) filter.severite = { $in: severite.split(',') }
  if (lu !== null && lu !== undefined) filter.lu = lu === 'true'

  const docs = await col
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  // Enrichissement : ferme / parcelle / capteur résolus
  const alertes = docs.map((a) => {
    const p = parcelleMap.get(a.parcelle_id)
    return {
      ...a,
      parcelle_nom: p?.parcelle_nom ?? null,
      ferme_nom:    p?.ferme_nom ?? null,
      capteur_type: a.capteur_id != null ? (capteurMap.get(a.capteur_id) ?? null) : null,
    }
  })

  return NextResponse.json({ alertes }, { status: 200 })
}
