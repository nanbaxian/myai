// types/clerk.ts

export interface ClerkUser {
  userId: string
  email?: string
  emailVerified?: boolean
  firstName?: string
  lastName?: string
  fullName?: string
  phoneNumber?: string
  profileImageUrl?: string
}

export interface ClerkSession {
  sessionId: string
  userId: string
  createdAt: number
  expiresAt: number
}

export interface ClerkJWTPayload {
  sub: string
  iss: string
  aud: string
  exp: number
  iat: number
  nbf: number
  jti: string
  email?: string
  email_verified?: boolean
  phone_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  org_id?: string
  org_slug?: string
  org_role?: string
  org_permissions?: string[]
}

export interface ApiResponse<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthContext {
  userId: string | null
  user: ClerkUser | null
  session: ClerkSession | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface ApiConfig {
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  onUnauthorized?: () => void
}
