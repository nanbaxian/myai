// functions/api/memory/core.ts
// GET /api/memory/core  DELETE /api/memory/core?id=xxx

import type { CoreMemory } from '../../../types/index'
import { createApiLogger } from '../../../lib/api-log'
import { dbAll, dbRun, type D1Env } from '../../../lib/knowledgeos-d1'

type Env = D1Env

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

function json(d: unknown, s = 200): Response {
  return new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const log = createApiLogger('memory:core:get', ctx)
  log.start()
  try {
    const rows = (await dbAll<CoreMemory>(
      ctx.env,
      `SELECT id, fact, category, importance, created_at FROM core_memories ORDER BY importance DESC, created_at DESC`,
    )) ?? []
    log.ok({ count: rows.length })
    return json(rows)
  } catch (e) {
    log.fail(e)
    return json([] as CoreMemory[])
  }
}

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const log = createApiLogger('memory:core:delete', ctx)
  log.start()
  try {
    const id = new URL(ctx.request.url).searchParams.get('id')
    if (!id) {
      log.fail('id required', { stage: 'validate' })
      return json({ error: 'id required' }, 400)
    }
    const ok = await dbRun(ctx.env, `DELETE FROM core_memories WHERE id = ?`, [id])
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
