// functions/api/memory/compress.ts
// POST /api/memory/compress
// 两种调用方式：
//   1. Cron Trigger → workers/cron-worker.ts 的 scheduled()（独立 Worker）
//   2. 管理页面手动触发 → 检查 Origin 是否同域（或 CRON_SECRET）

import { compressMemories } from '../../../lib/memory-engine'

interface Env {
  GEMINI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  CRON_SECRET: string
  AI: Ai  // Workers AI binding — @cf/baai/bge-m3 向量嵌入（1024维）
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth    = request.headers.get('Authorization') ?? ''
  const origin  = request.headers.get('Origin') ?? ''
  const referer = request.headers.get('Referer') ?? ''

  // 允许方式：
  // 1. Bearer CRON_SECRET（Cron Worker）
  // 2. 同域浏览器请求：Origin 或 Referer 包含请求 host
  //    注意：浏览器 fetch 同域时会发 Origin（不是空字符串），所以不能用 !origin 判断
  const reqHost = new URL(request.url).host
  const fromSameHost =
    (origin  && new URL(origin).host  === reqHost) ||
    (referer && new URL(referer).host === reqHost)

  const isAuthorized =
    auth === `Bearer ${env.CRON_SECRET}` ||
    fromSameHost

  if (!isAuthorized) return json({ error: 'Unauthorized' }, 401)

  try {
    await compressMemories(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, env.GEMINI_API_KEY, env.AI)
    return json({ success: true, timestamp: new Date().toISOString() })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: msg }, 500)
  }
}

