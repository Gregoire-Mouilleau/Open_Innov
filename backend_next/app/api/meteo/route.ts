import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth/verify'

const BASE_URL = process.env.OPEN_METEO_BASE_URL!

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const mode = searchParams.get('mode') ?? 'daily'

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat et lng requis' }, { status: 400 })
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    timezone: 'auto',
    forecast_days: mode === 'hourly' ? '2' : '7',
  })

  if (mode === 'hourly') {
    params.set('hourly', 'temperature_2m,precipitation,windspeed_10m,relativehumidity_2m,cloudcover')
  } else {
    params.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode')
  }

  const res = await fetch(`${BASE_URL}/forecast?${params.toString()}`, {
    next: { revalidate: 1800 }, // cache 30 min côté Next.js
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'erreur open-meteo', detail: await res.text() }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json({ mode, lat, lng, data }, { status: 200 })
}
