import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getMongoDb } from '@/lib/db/mongoNative'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

// Marquer une alerte comme lue / non lue
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const lu = body?.lu !== undefined ? !!body.lu : true

  let _id: ObjectId
  try {
    _id = new ObjectId(id)
  } catch {
    return NextResponse.json({ error: 'id invalide' }, { status: 400 })
  }

  const db = await getMongoDb()
  const res = await db.collection('alertes').updateOne({ _id }, { $set: { lu } })

  if (res.matchedCount === 0) {
    return NextResponse.json({ error: 'alerte introuvable' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, lu }, { status: 200 })
}
