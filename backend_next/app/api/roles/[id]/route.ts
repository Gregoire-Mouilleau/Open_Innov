import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'
import { hasPermission } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

/** GET /api/roles/[id] */
export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params
  const res = await pool.query(
    `SELECT cr.id, cr.nom, cr.base_role, cr.created_at,
            ARRAY_REMOVE(ARRAY_AGG(rp.permission_key), NULL) AS permissions
     FROM company_role cr
     LEFT JOIN role_permission rp ON rp.role_id = cr.id
     WHERE cr.id = $1
     GROUP BY cr.id`,
    [Number(id)]
  )
  if (res.rowCount === 0) return NextResponse.json({ error: 'rôle introuvable' }, { status: 404 })
  return NextResponse.json({ role: res.rows[0] }, { status: 200 })
}

/** PUT /api/roles/[id] — met à jour le nom et/ou les permissions */
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const canManage = await hasPermission(pool, auth.sub, 'manage_roles')
  if (!canManage) return NextResponse.json({ error: 'permission insuffisante' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { nom, base_role, permissions }: { nom?: string; base_role?: string; permissions?: string[] } = body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Mise à jour du nom / base_role
    const updated = await client.query<{ id: number; nom: string; base_role: string }>(
      `UPDATE company_role
       SET nom       = COALESCE($1, nom),
           base_role = COALESCE($2, base_role)
       WHERE id = $3
       RETURNING id, nom, base_role`,
      [nom?.trim() ?? null, base_role ?? null, Number(id)]
    )
    if (updated.rowCount === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'rôle introuvable' }, { status: 404 })
    }

    // Recalcule les permissions si fournies
    if (Array.isArray(permissions)) {
      await client.query('DELETE FROM role_permission WHERE role_id = $1', [Number(id)])
      if (permissions.length > 0) {
        const vals = permissions.map((_: string, i: number) => `($1, $${i + 2})`).join(',')
        await client.query(
          `INSERT INTO role_permission (role_id, permission_key) VALUES ${vals}`,
          [Number(id), ...permissions]
        )
      }
      // Resync le role string des membres si base_role a changé
      if (base_role) {
        await client.query(
          `UPDATE users SET role = $1, updated_at = NOW()
           WHERE company_role_id = $2`,
          [updated.rows[0].base_role, Number(id)]
        )
      }
    }

    await client.query('COMMIT')
    return NextResponse.json(
      { role: { ...updated.rows[0], permissions: permissions ?? [] } },
      { status: 200 }
    )
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[roles PUT]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    client.release()
  }
}

/** DELETE /api/roles/[id] */
export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const canManage = await hasPermission(pool, auth.sub, 'manage_roles')
  if (!canManage) return NextResponse.json({ error: 'permission insuffisante' }, { status: 403 })

  const { id } = await params

  // Impossible de supprimer un rôle qui a des membres
  const countRes = await pool.query<{ count: string }>(
    'SELECT COUNT(*) FROM users WHERE company_role_id = $1',
    [Number(id)]
  )
  if (Number.parseInt(countRes.rows[0].count, 10) > 0) {
    return NextResponse.json(
      { error: 'Ce rôle est assigné à des membres. Réassignez-les d\'abord.' },
      { status: 409 }
    )
  }

  const res = await pool.query('DELETE FROM company_role WHERE id = $1 RETURNING id', [Number(id)])
  if (res.rowCount === 0) return NextResponse.json({ error: 'rôle introuvable' }, { status: 404 })

  return NextResponse.json({ message: 'rôle supprimé' }, { status: 200 })
}
