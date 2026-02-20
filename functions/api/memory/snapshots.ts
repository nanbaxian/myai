// functions/api/memory/snapshots.ts
// GET /api/memory/snapshots  DELETE /api/memory/snapshots?id=xxx

import type { MemorySnapshot } from '../../../types/index'

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
    `${env.SUPABASE_URL}/rest/v1/memory_snapshots?select=id,tier,summary_text,key_facts,emotional_tone,clarity_score,period_start,period_end&order=period_end.desc`,
    { headers: sb(env.SUPABASE_SERVICE_KEY) }
  )
  if (!res.ok) return json([] as MemorySnapshot[])
  return json(await res.json() as MemorySnapshot[])
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return json({ error: 'id required' }, 400)
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/memory_snapshots?id=eq.${id}`, {
    method: 'DELETE',
    headers: sb(env.SUPABASE_SERVICE_KEY),
  })
  if (!res.ok) return json({ error: '删除失败' }, 500)
  return json({ success: true })
}
