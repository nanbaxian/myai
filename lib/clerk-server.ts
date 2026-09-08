// lib/clerk-server.ts
import { jwtDecode } from 'jwt-decode'

export interface AuthUser {
  userId: string
  email?: string
  emailVerified?: boolean
}

interface JWTPayload {
  sub: string
  email?: string
  email_verified?: boolean
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function verifyClerkJwt(req: Request): Promise<AuthUser> {
  const token = getBearerToken(req)
  if (!token) throw new Error('Missing Authorization Bearer token')

  try {
    const decoded = jwtDecode<JWTPayload>(token)

    // Basic validations
    if (!decoded.sub) throw new Error('Invalid token: missing sub')

    return {
      userId: decoded.sub,
      email: decoded.email,
      emailVerified: decoded.email_verified,
    }
  } catch (err) {
    throw new Error(`Invalid Clerk JWT: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}
