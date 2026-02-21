// lib/auth.ts
// Verify Supabase JWT (Magic Link session access_token) inside Cloudflare Pages Functions/Workers.

export type AuthUser = { userId: string; email?: string }

function b64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(b64 + pad)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

function decodeB64urlJson(b64url: string): any {
  const bin = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (bin.length % 4)) % 4)
  return JSON.parse(atob(bin + pad))
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization') || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1] ?? null
}

function derLength(len: number): Uint8Array {
  if (len < 0x80) return Uint8Array.of(len)
  if (len <= 0xff) return Uint8Array.of(0x81, len)
  return Uint8Array.of(0x82, (len >> 8) & 0xff, len & 0xff)
}

function trimLeadingZeros(bytes: Uint8Array): Uint8Array {
  let i = 0
  while (i < bytes.length - 1 && bytes[i] === 0) i++
  return bytes.subarray(i)
}

function joseEcdsaSigToDer(rawSig: Uint8Array): Uint8Array {
  if (rawSig.length % 2 !== 0) throw new Error('Invalid ECDSA signature length')
  const n = rawSig.length / 2
  let r = trimLeadingZeros(rawSig.subarray(0, n))
  let s = trimLeadingZeros(rawSig.subarray(n))
  if (r[0] & 0x80) r = Uint8Array.of(0, ...r)
  if (s[0] & 0x80) s = Uint8Array.of(0, ...s)

  const rPart = Uint8Array.of(0x02, ...derLength(r.length), ...r)
  const sPart = Uint8Array.of(0x02, ...derLength(s.length), ...s)
  const seqLen = rPart.length + sPart.length
  return Uint8Array.of(0x30, ...derLength(seqLen), ...rPart, ...sPart)
}

function pickHash(alg: string): 'SHA-256' | 'SHA-384' | 'SHA-512' {
  if (alg.endsWith('384')) return 'SHA-384'
  if (alg.endsWith('512')) return 'SHA-512'
  return 'SHA-256'
}

export async function verifySupabaseJwt(req: Request, env: any): Promise<AuthUser> {
  const token = getBearerToken(req)
  if (!token) throw new Error('Missing Authorization Bearer token')

  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT')
  const [h, p, s] = parts
  const header = decodeB64urlJson(h)
  const payload = decodeB64urlJson(p)

  const kid = header.kid
  if (!kid) throw new Error('JWT missing kid')

  const rawSupabaseUrl = String(env.SUPABASE_URL || '').trim()
  if (!rawSupabaseUrl) throw new Error('Missing SUPABASE_URL')
  const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '')
  const isAuthBase = /\/auth\/v1$/i.test(supabaseUrl)
  const jwksUrls = isAuthBase
    ? [
        `${supabaseUrl}/certs`,
        `${supabaseUrl}/.well-known/jwks.json`,
      ]
    : [
        `${supabaseUrl}/auth/v1/certs`,
        `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      ]
  const certsApiKey = String(env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY || '').trim()

  // Fetch JWKS (cached by Cloudflare), with endpoint fallback for different GoTrue versions.
  let jwksRes: Response | null = null
  const attempts: string[] = []
  for (const url of jwksUrls) {
    try {
      const res = await fetch(url, {
        headers: certsApiKey
          ? {
              apikey: certsApiKey,
              Authorization: `Bearer ${certsApiKey}`,
            }
          : undefined,
        cf: { cacheTtl: 3600, cacheEverything: true } as any,
      })
      attempts.push(`${res.status} ${url}`)
      if (res.ok) {
        jwksRes = res
        break
      }
    } catch (e: any) {
      attempts.push(`ERR ${url}: ${e?.message || 'network error'}`)
    }
  }
  if (!jwksRes) throw new Error(`Failed to fetch JWKS: ${attempts.join(' | ')}`)
  const jwks = await jwksRes.json() as any
  const jwk = (jwks.keys || []).find((k: any) => k.kid === kid)
  if (!jwk) throw new Error('No matching JWK')

  const alg = String(header.alg || '')
  const hash = pickHash(alg)
  let importAlgo: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams
  let verifyAlgo: AlgorithmIdentifier | RsaPssParams | EcdsaParams
  let sigBytes = b64urlToUint8Array(s)

  if (jwk.kty === 'RSA') {
    if (alg.startsWith('PS')) {
      importAlgo = { name: 'RSA-PSS', hash }
      verifyAlgo = { name: 'RSA-PSS', saltLength: Number(alg.slice(2)) / 8 || 32 }
    } else {
      importAlgo = { name: 'RSASSA-PKCS1-v1_5', hash }
      verifyAlgo = 'RSASSA-PKCS1-v1_5'
    }
  } else if (jwk.kty === 'EC') {
    const namedCurve =
      jwk.crv === 'P-256' ? 'P-256' :
      jwk.crv === 'P-384' ? 'P-384' :
      jwk.crv === 'P-521' ? 'P-521' :
      (alg === 'ES256' ? 'P-256' : alg === 'ES384' ? 'P-384' : 'P-521')
    importAlgo = { name: 'ECDSA', namedCurve }
    verifyAlgo = { name: 'ECDSA', hash }
    // JWT uses JOSE raw (R||S); WebCrypto ECDSA verify expects DER signature.
    sigBytes = joseEcdsaSigToDer(sigBytes)
  } else {
    throw new Error(`Unsupported JWK key type: ${String(jwk.kty || 'unknown')} (alg=${alg || 'unknown'})`)
  }

  const key = await crypto.subtle.importKey('jwk', jwk, importAlgo, false, ['verify'])

  const enc = new TextEncoder()
  const ok = await crypto.subtle.verify(verifyAlgo, key, sigBytes, enc.encode(`${h}.${p}`))
  if (!ok) throw new Error('Invalid JWT signature')

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) throw new Error('JWT expired')
  if (env.SUPABASE_JWT_ISS && payload.iss !== env.SUPABASE_JWT_ISS) throw new Error('JWT issuer mismatch')
  if (env.SUPABASE_JWT_AUD && payload.aud !== env.SUPABASE_JWT_AUD) throw new Error('JWT audience mismatch')

  const userId = payload.sub
  if (!userId) throw new Error('JWT missing sub')
  return { userId: String(userId), email: payload.email }
}
