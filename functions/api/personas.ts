// functions/api/personas.ts
// GET /api/personas  POST /api/personas  DELETE /api/personas?id=xxx

import type { Persona } from '../../types/index'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sb(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/personas?order=created_at.asc`, {
    headers: sb(env.SUPABASE_SERVICE_KEY),
  })
  if (!res.ok) return json([] as Persona[])
  return json(await res.json() as Persona[])
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json() as Partial<Persona>
  const { name, avatar, prompt, reply_style } = body

  if (!name?.trim())              return json({ error: '名字不能为空' }, 400)
  if (prompt && prompt.length > 1000) return json({ error: '人设描述不能超过1000字' }, 400)

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/personas`, {
    method: 'POST',
    headers: sb(env.SUPABASE_SERVICE_KEY),
    body: JSON.stringify({ name, avatar: avatar ?? '🌸', prompt, reply_style: reply_style ?? 'medium' }),
  })
  if (!res.ok) return json({ error: '创建失败' }, 500)
  const rows = await res.json() as Persona[]
  if (!rows[0]) return json({ error: '创建失败' }, 500)
  return json(rows[0])
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return json({ error: 'id 不能为空' }, 400)

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/personas?id=eq.${id}`, {
    method: 'DELETE',
    headers: sb(env.SUPABASE_SERVICE_KEY),
  })
  if (!res.ok) return json({ error: '删除失败' }, 500)
  return json({ success: true })
}
