// hooks/useClerkApi.ts
'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

export function useClerkApi() {
  const { getToken } = useAuth()

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const headers = new Headers(options.headers || {})
      headers.set('Authorization', `Bearer ${token}`)

      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return response.json()
    },
    [getToken]
  )

  return { fetchWithAuth }
}
