// functions/api/upload.ts
// POST /api/upload — upload image/audio to Cloudflare R2, return { url, key, contentType }
// Requires Clerk Auth (Authorization: Bearer <clerk_token>)

import { verifyClerkToken } from '@/lib/api-middleware'
import { createApiLogger } from '@/lib/api-log'

interface Env {
  BUCKET: R2Bucket
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx
  const log = createApiLogger('upload', ctx)
  const contentType = request.headers.get('content-type') || 'unknown'
  const contentLength = request.headers.get('content-length') || 'unknown'
  log.start({ contentType, contentLength })

  let userId = 'unknown'
  try {
    const authHeader = request.headers.get('Authorization') || ''
    const auth = await verifyClerkToken(authHeader)
    userId = auth.userId
    log.info('auth:ok', { userId })
  } catch (e: any) {
    log.fail(e, { stage: 'auth' })
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: e?.message }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    log.fail('Expected multipart/form-data', { stage: 'parse', userId })
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const file = form.get('file') as File | null
  if (!file) {
    log.fail('Missing file', { stage: 'validate', userId })
    return new Response(JSON.stringify({ error: 'Missing file' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Keep key simple (no slashes) to work with /r2/[key]
  const key = crypto.randomUUID()
  log.info('r2:put:start', {
    userId,
    key,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
  })
  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })
  log.info('r2:put:ok', { userId, key })
  log.ok({ userId, key })
  const origin = new URL(request.url).origin
  const relativeUrl = `/r2/${key}`
  const absoluteUrl = `${origin}${relativeUrl}`

  return new Response(JSON.stringify({
    key,
    url: absoluteUrl,
    path: relativeUrl,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    name: file.name,
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
