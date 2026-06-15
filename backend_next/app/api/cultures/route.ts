import { NextResponse } from 'next/server'
import pool from '@/lib/db/postgres'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const result = await pool.query(
    `SELECT nom, icon, soil_min, soil_max, temp_min, temp_max,
            hum_air_min, hum_air_max, besoin_eau, besoin_soleil
     FROM culture
     ORDER BY nom`
  )

  return NextResponse.json({ cultures: result.rows }, { status: 200 })
}
