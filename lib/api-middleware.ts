// lib/api-middleware.ts
// Middleware for Clerk JWT verification in Cloudflare Workers

import type { AuthUser } from './clerk-server'

export async function verifyClerkToken(authHeader: string): Promise<AuthUser> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)

  // For worker environments, verify via Clerk API
  try {
    const res = await fetch('https://api.clerk.com/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (!res.ok) {
      throw new Error(`Clerk verification failed: ${res.status}`)
    }

    const data = (await res.json()) as { sub?: string; user_id?: string; email?: string; email_verified?: boolean }
    const userId = data.sub || data.user_id
    if (!userId) throw new Error('Invalid Clerk token: missing user id')

    return {
      userId,
      email: data.email,
      emailVerified: data.email_verified,
    }
  } catch (err) {
    throw new Error(`Invalid Clerk token: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}
