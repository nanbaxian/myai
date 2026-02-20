
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
  try {
    await verifySupabaseJwt(request, env)
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: e?.message }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const file = form.get('file') as File | null
  if (!file) {
    return new Response(JSON.stringify({ error: 'Missing file' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Keep key simple (no slashes) to work with /r2/[key]
  const key = crypto.randomUUID()
  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })

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
