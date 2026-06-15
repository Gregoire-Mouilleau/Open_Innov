import { SignJWT, jwtVerify } from 'jose'

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET!)
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)

export type JWTPayload = {
  sub: string
  email: string
  isAdmin: boolean
  role: string
}

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(accessSecret)
}

export async function signRefreshToken(payload: Pick<JWTPayload, 'sub'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret)
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, accessSecret)
  return payload as unknown as JWTPayload
}

export async function verifyRefreshToken(token: string): Promise<Pick<JWTPayload, 'sub'>> {
  const { payload } = await jwtVerify(token, refreshSecret)
  return payload as unknown as Pick<JWTPayload, 'sub'>
}
