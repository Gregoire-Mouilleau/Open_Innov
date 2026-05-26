import { NextResponse } from 'next/server'
import { verifyAccessToken, type JWTPayload } from './token'

export async function requireAuth(request: Request): Promise<JWTPayload | NextResponse> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'token manquant' }, { status: 401 })
  }

  const token = authHeader.slice(7)

  try {
    return await verifyAccessToken(token)
  } catch {
    return NextResponse.json({ error: 'token invalide ou expiré' }, { status: 401 })
  }
}

export function isAuthError(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}
