import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import minioClient from '@/lib/db/minio'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

type Params = { params: Promise<{ id: string }> }

const BUCKET = process.env.MINIO_BUCKET_PHOTOS!
const URL_TTL = 60 * 60 // 1 heure

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { id } = await params

  const result = await pool.query(
    `SELECT id, url_path, uploaded_by, uploaded_at
     FROM photo
     WHERE entity_type = 'parcelle' AND entity_id = $1
     ORDER BY uploaded_at DESC`,
    [Number(id)]
  )

  const photos = await Promise.all(
    result.rows.map(async (row) => {
      const url = await minioClient.presignedGetObject(BUCKET, row.url_path, URL_TTL)
      return { ...row, url }
    })
  )

  return NextResponse.json({ photos }, { status: 200 })
}
