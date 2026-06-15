import { NextResponse } from 'next/server'
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

  // Company du user → on ne renvoie que les alertes de ses parcelles
  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1', [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id

  const conds: string[] = ['f.company_id = $1']
  const params: (number | string | boolean | string[])[] = [companyId ?? -1]
  let i = 2
  if (parcelleId) { conds.push(`a.parcelle_id = $${i++}`); params.push(Number(parcelleId)) }
  if (severite)   { conds.push(`a.severite = ANY($${i++})`); params.push(severite.split(',')) }
  if (lu !== null && lu !== undefined) { conds.push(`a.lu = $${i++}`); params.push(lu === 'true') }
  params.push(limit)
  const limitParam = `$${i}`

  const result = await pool.query(
    `SELECT a.id, a.parcelle_id, a.capteur_id, a.type, a.severite,
            a.valeur_declenchante, a.message, a.lu, a.created_at,
            p.nom AS parcelle_nom, f.nom AS ferme_nom, c.type AS capteur_type
     FROM alerte a
     JOIN parcelle p ON p.id = a.parcelle_id
     JOIN farm f     ON f.id = p.farm_id
     LEFT JOIN capteur c ON c.id = a.capteur_id
     WHERE ${conds.join(' AND ')}
     ORDER BY a.created_at DESC
     LIMIT ${limitParam}`,
    params
  )

  // _id (string) conservé pour compat front (qui clé sur _id)
  const alertes = result.rows.map((a) => ({ ...a, _id: String(a.id) }))

  return NextResponse.json({ alertes }, { status: 200 })
}
