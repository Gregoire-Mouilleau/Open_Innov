import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'
import { DEFAULT_ROLES } from '@/lib/permissions'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const result = await pool.query(
    'SELECT id, nom, telephone, code_postal, country, created_at FROM company ORDER BY created_at DESC'
  )

  return NextResponse.json({ companies: result.rows }, { status: 200 })
}

export async function POST(request: Request) {
  const authRes = await requireAuth(request)
  if (isAuthError(authRes)) return authRes

  const body = await request.json()
  const { nom, telephone, code_postal, country } = body

  if (!nom) {
    return NextResponse.json({ error: 'nom requis' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query<{ id: number; nom: string; telephone: string | null; code_postal: string | null; country: string | null }>(
      `INSERT INTO company (nom, telephone, code_postal, country, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, nom, telephone, code_postal, country`,
      [nom, telephone ?? null, code_postal ?? null, country ?? null]
    )
    const company = result.rows[0]

    // Créer les 3 rôles par défaut pour cette company
    let gerantRoleId: number | null = null
    for (const roleDef of DEFAULT_ROLES) {
      const roleRes = await client.query<{ id: number }>(
        `INSERT INTO company_role (company_id, nom, base_role, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [company.id, roleDef.nom, roleDef.base_role]
      )
      const roleId = roleRes.rows[0].id
      if (roleDef.permissions.length > 0) {
        const permValues = roleDef.permissions.map((_: string, i: number) => `($1, $${i + 2})`).join(',')
        await client.query(
          `INSERT INTO role_permission (role_id, permission_key) VALUES ${permValues}`,
          [roleId, ...roleDef.permissions]
        )
      }
      if (roleDef.base_role === 'gerant') gerantRoleId = roleId
    }

    // Rattacher l'user + lui assigner le rôle Gérant
    await client.query(
      `UPDATE users
       SET company_id      = $1,
           company_role_id = $2,
           role            = 'gerant',
           updated_at      = NOW()
       WHERE id = $3 AND company_id IS NULL`,
      [company.id, gerantRoleId, authRes.sub]
    )

    await client.query('COMMIT')
    return NextResponse.json({ company }, { status: 201 })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[companies POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    client.release()
  }
}
