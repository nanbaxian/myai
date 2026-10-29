// functions/api/memory/snapshots.ts
// GET /api/memory/snapshots  DELETE /api/memory/snapshots?id=xxx

import type { MemorySnapshot } from '../../../types/index'
import { createApiLogger } from '../../../lib/api-log'
import { dbAll, dbRun, type D1Env } from '../../../lib/knowledgeos-d1'

type Env = D1Env

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

function json(d: unknown, s = 200): Response {
  return new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function parseKeyFacts(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const log = createApiLogger('memory:snapshots:get', ctx)
  log.start()
  try {
    const rows = (await dbAll<Omit<MemorySnapshot, 'key_facts'> & { key_facts: string }>(
      ctx.env,
      `SELECT id, tier, summary_text, key_facts, emotional_tone, clarity_score, period_start, period_end
       FROM memory_snapshots ORDER BY period_end DESC`,
    )) ?? []
    const snapshots: MemorySnapshot[] = rows.map(row => ({ ...row, key_facts: parseKeyFacts(row.key_facts) }))
    log.ok({ count: snapshots.length })
    return json(snapshots)
  } catch (e) {
    log.fail(e)
    return json([] as MemorySnapshot[])
  }
}

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const log = createApiLogger('memory:snapshots:delete', ctx)
  log.start()
  try {
    const id = new URL(ctx.request.url).searchParams.get('id')
    if (!id) {
      log.fail('id required', { stage: 'validate' })
      return json({ error: 'id required' }, 400)
    }
    const ok = await dbRun(ctx.env, `DELETE FROM memory_snapshots WHERE id = ?`, [id])
    if (!ok) {
      log.fail('d1 delete failed', { stage: 'db', id })
      return json({ error: '删除失败' }, 500)
    }
    log.ok({ id })
    return json({ success: true })
  } catch (e) {
    log.fail(e)
    return json({ error: '删除失败' }, 500)
  }
}
