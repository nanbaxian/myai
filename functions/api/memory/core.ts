// functions/api/memory/core.ts
// GET /api/memory/core  DELETE /api/memory/core?id=xxx

import type { CoreMemory } from '../../../types/index'

interface Env { SUPABASE_URL: string; SUPABASE_SERVICE_KEY: string }

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

function sb(k: string): Record<string, string> {
  return { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' }
}

function json(d: unknown, s = 200): Response {
  return new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/core_memories?order=importance.desc,created_at.desc`,
    { headers: sb(env.SUPABASE_SERVICE_KEY) }
  )
  if (!res.ok) return json([] as CoreMemory[])
  return json(await res.json() as CoreMemory[])
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return json({ error: 'id required' }, 400)
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/core_memories?id=eq.${id}`, {
    method: 'DELETE',
    headers: sb(env.SUPABASE_SERVICE_KEY),
  })
  if (!res.ok) return json({ error: '删除失败' }, 500)
  return json({ success: true })
}
