
// functions/api/upload.ts
// POST /api/upload — upload image/audio to Cloudflare R2, return { url, key, contentType }
// Requires Supabase Auth (Authorization: Bearer <access_token>)

import { verifySupabaseJwt } from '@/lib/auth'

interface Env {
  BUCKET: R2Bucket
  SUPABASE_URL: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ray = request.headers.get('cf-ray') || 'no-ray'
  const contentType = request.headers.get('content-type') || 'unknown'
  const contentLength = request.headers.get('content-length') || 'unknown'
  const requestUrl = new URL(request.url)
  const reqMeta = {
    ray,
    method: request.method,
    path: requestUrl.pathname,
    contentType,
    contentLength,
  }
  console.log('[upload] request:start', reqMeta)

  let userId = 'unknown'
  try {
    const auth = await verifySupabaseJwt(request, env)
    userId = auth.userId
    console.log('[upload] auth:ok', { ray, userId })
  } catch (e: any) {
    console.error('[upload] auth:fail', { ray, detail: e?.message || 'unknown auth error' })
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: e?.message }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    console.error('[upload] parse:fail', { ray, userId, detail: 'Expected multipart/form-data' })
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const file = form.get('file') as File | null
  if (!file) {
    console.error('[upload] file:missing', { ray, userId })
    return new Response(JSON.stringify({ error: 'Missing file' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Keep key simple (no slashes) to work with /r2/[key]
  const key = crypto.randomUUID()
  console.log('[upload] r2:put:start', {
    ray,
    userId,
    key,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
  })
  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })
  console.log('[upload] r2:put:ok', { ray, userId, key })

  return new Response(JSON.stringify({
    key,
    url: `/r2/${key}`,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    name: file.name,
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
