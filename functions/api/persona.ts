// functions/api/persona.ts
// GET /api/persona  →  当前活跃人设
// PUT /api/persona  →  更新当前活跃人设

import type { Persona } from '../../types/index'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sb(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

async function getActiveId(supabaseUrl: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.active_persona_id`, { headers: sb(key) })
    if (!res.ok) return null
    const [row] = await res.json() as Array<{ value: unknown }>
    if (!row) return null
    const v = row.value
    if (typeof v === 'string') { try { return JSON.parse(v) } catch { return v } }
    return String(v)
  } catch {
    return null
  }
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const id  = await getActiveId(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
  const url = id
    ? `${env.SUPABASE_URL}/rest/v1/personas?id=eq.${id}&limit=1`
    : `${env.SUPABASE_URL}/rest/v1/personas?limit=1`
  const [persona] = await (await fetch(url, { headers: sb(env.SUPABASE_SERVICE_KEY) })).json() as Persona[]
  return json(persona ?? null)
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json() as Partial<Persona>
  const { name, avatar, prompt, reply_style } = body

  if (prompt && prompt.length > 1000) return json({ error: '人设描述不能超过1000字' }, 400)
  if (!name?.trim())                   return json({ error: '名字不能为空' }, 400)

  const id = await getActiveId(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
  const matchUrl = id
    ? `${env.SUPABASE_URL}/rest/v1/personas?id=eq.${id}`
    : `${env.SUPABASE_URL}/rest/v1/personas?limit=1`   // 兜底：更新第一个

  const payload = { name, avatar, prompt, reply_style, updated_at: new Date().toISOString() }
  const res = await fetch(matchUrl, {
    method: 'PATCH',
    headers: sb(env.SUPABASE_SERVICE_KEY),
    body: JSON.stringify(payload),
  })
  if (!res.ok) return json({ error: '数据库更新失败' }, 500)
  const rows = await res.json() as Persona[]
  if (!rows[0]) return json({ error: '人设不存在' }, 404)
  return json(rows[0])
}
