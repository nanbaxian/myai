// lib/api-middleware.ts
// Middleware for Clerk JWT verification in Cloudflare Workers

import { verifyToken } from '@clerk/backend'
import type { AuthUser } from './clerk-server'

export async function verifyClerkToken(authHeader: string, secretKey: string): Promise<AuthUser> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)

  // Verify the session JWT locally against Clerk's JWKS, signed with the secret key
  try {
    const payload = await verifyToken(token, { secretKey })

    const userId = payload.sub
    if (!userId) throw new Error('Invalid Clerk token: missing user id')

    return {
      userId,
      email: payload.email as string | undefined,
      emailVerified: payload.email_verified as boolean | undefined,
    }
  } catch (err) {
    throw new Error(`Invalid Clerk token: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}
