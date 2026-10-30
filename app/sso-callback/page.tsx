'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

// Finishes the Google OAuth redirect started by the chat page's sign-in button.
export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback />
}
