import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { first_name, last_name, role, company_id, company_role_id } = body

  const client = await pool.connect()
  try {
    // Si on change de company_role, on récupère le base_role pour syncer le champ role
    let resolvedRole = role ?? null
    if (company_role_id != null) {
      const crRes = await client.query<{ base_role: string }>(
        'SELECT base_role FROM company_role WHERE id = $1',
        [Number(company_role_id)]
      )
      if (crRes.rowCount === 0) {
        client.release()
        return NextResponse.json({ error: 'rôle introuvable' }, { status: 404 })
      }
      resolvedRole = crRes.rows[0].base_role
    }

    const result = await client.query(
      `UPDATE users
       SET first_name       = COALESCE($1, first_name),
           last_name        = COALESCE($2, last_name),
           role             = COALESCE($3, role),
           company_id       = COALESCE($4, company_id),
           company_role_id  = COALESCE($5, company_role_id),
           updated_at       = NOW()
       WHERE id = $6
       RETURNING id, email, first_name, last_name, role, company_id, company_role_id`,
      [first_name ?? null, last_name ?? null, resolvedRole, company_id ?? null,
       company_role_id ?? null, Number(id)]
    )

    client.release()

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json({ user: result.rows[0] }, { status: 200 })
  } catch (err) {
    client.release()
    console.error('[users PUT]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'accès réservé aux admins' }, { status: 403 })
  }

  const { id } = await params

  if (String(auth.sub) === id) {
    return NextResponse.json({ error: 'impossible de supprimer son propre compte' }, { status: 400 })
  }

  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [Number(id)])

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'utilisateur introuvable' }, { status: 404 })
  }

  return NextResponse.json({ message: 'utilisateur supprimé' }, { status: 200 })
}
