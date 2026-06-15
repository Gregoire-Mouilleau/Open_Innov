import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'
import { hasPermission } from '@/lib/permissions'

/** GET /api/roles — liste les rôles de la company du user connecté */
export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1',
    [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id
  if (!companyId) return NextResponse.json({ error: 'aucune organisation' }, { status: 404 })

  const rolesRes = await pool.query(
    `SELECT cr.id, cr.nom, cr.base_role, cr.created_at,
            ARRAY_REMOVE(ARRAY_AGG(rp.permission_key), NULL) AS permissions,
            COUNT(DISTINCT u.id)::int AS member_count
     FROM company_role cr
     LEFT JOIN role_permission rp ON rp.role_id = cr.id
     LEFT JOIN users u ON u.company_role_id = cr.id
     WHERE cr.company_id = $1
     GROUP BY cr.id
     ORDER BY cr.created_at ASC`,
    [companyId]
  )

  return NextResponse.json({ roles: rolesRes.rows }, { status: 200 })
}

/** POST /api/roles — créer un nouveau rôle (requiert manage_roles) */
export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const canManage = await hasPermission(pool, auth.sub, 'manage_roles')
  if (!canManage) return NextResponse.json({ error: 'permission insuffisante' }, { status: 403 })

  const body = await request.json()
  const { nom, base_role, permissions }: { nom: string; base_role?: string; permissions?: string[] } = body

  if (!nom?.trim()) return NextResponse.json({ error: 'nom requis' }, { status: 400 })

  const userRes = await pool.query<{ company_id: number | null }>(
    'SELECT company_id FROM users WHERE id = $1',
    [Number(auth.sub)]
  )
  const companyId = userRes.rows[0]?.company_id
  if (!companyId) return NextResponse.json({ error: 'aucune organisation' }, { status: 404 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const roleRes = await client.query<{ id: number; nom: string; base_role: string }>(
      `INSERT INTO company_role (company_id, nom, base_role, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id, nom, base_role`,
      [companyId, nom.trim(), base_role ?? 'farmer']
    )
    const role = roleRes.rows[0]

    if (permissions && permissions.length > 0) {
      const vals = permissions.map((_: string, i: number) => `($1, $${i + 2})`).join(',')
      await client.query(
        `INSERT INTO role_permission (role_id, permission_key) VALUES ${vals}`,
        [role.id, ...permissions]
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({ role: { ...role, permissions: permissions ?? [] } }, { status: 201 })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[roles POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    client.release()
  }
}
