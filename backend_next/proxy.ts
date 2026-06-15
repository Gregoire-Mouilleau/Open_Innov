import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  'http://localhost:8081', // Expo web dev
  'http://localhost:19006', // Expo web (ancien port)
  process.env.FRONTEND_URL ?? '',
].filter(Boolean)

// Domaines d'hébergement front autorisés (POC) : Vercel / Netlify / Cloudflare Pages
const ALLOWED_ORIGIN_PATTERNS = [/\.vercel\.app$/, /\.netlify\.app$/, /\.pages\.dev$/]

function getAllowedOrigin(origin: string | null): string {
  if (!origin) return ALLOWED_ORIGINS[0]
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  try {
    const host = new URL(origin).hostname
    if (ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(host))) return origin
  } catch { /* origine invalide */ }
  return ALLOWED_ORIGINS[0]
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods':  'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':  'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age':        '86400',
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigin = getAllowedOrigin(origin)

  // Preflight OPTIONS → répondre directement 204
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        ...CORS_HEADERS,
      },
    })
  }

  // Autres méthodes → laisser passer en ajoutant les headers
  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
  return response
}

export const config = {
  matcher: '/api/:path*',
}
