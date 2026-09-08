// lib/clerk-browser.ts
'use client'

import { useAuth, useUser } from '@clerk/nextjs'

export function useClerkAuth() {
  const { isLoaded, userId, sessionId, getToken } = useAuth()
  const { user } = useUser()

  return {
    isLoaded,
    userId,
    sessionId,
    user,
    email: user?.primaryEmailAddress?.emailAddress,
    async getToken(template?: string) {
      return getToken({ template })
    },
  }
}
