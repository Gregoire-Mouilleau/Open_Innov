import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params

  const companyRes = await pool.query(
    'SELECT id, nom, telephone, code_postal, country, created_at FROM company WHERE id = $1',
    [Number(id)]
  )
  if (companyRes.rowCount === 0) {
    return NextResponse.json({ error: 'company introuvable' }, { status: 404 })
  }

  const [farmsRes, membersRes] = await Promise.all([
    pool.query(
      `SELECT f.id, f.nom, f.adresse, f.code_postal, f.country, f.latitude, f.longitude, f.created_at,
              COUNT(p.id)::int AS parcelles_count
       FROM farm f
       LEFT JOIN parcelle p ON p.farm_id = f.id
       WHERE f.company_id = $1
       GROUP BY f.id
       ORDER BY f.created_at DESC`,
      [Number(id)]
    ),
    pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.company_role_id,
              cr.nom AS role_nom
       FROM users u
       LEFT JOIN company_role cr ON cr.id = u.company_role_id
       WHERE u.company_id = $1 ORDER BY u.created_at DESC`,
      [Number(id)]
    ),
  ])

  return NextResponse.json({
    company: companyRes.rows[0],
    farms:   farmsRes.rows,
    members: membersRes.rows,
  }, { status: 200 })
}

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
