// functions/api/memory/list.ts
// GET /api/memory/list: a short preview of core, short-term and snapshot memories

import type { CoreMemory, DbMessage } from '../../../types/index'
import { createApiLogger } from '../../../lib/api-log'
import { dbAll, dbFirst, type D1Env } from '../../../lib/knowledgeos-d1'

type Env = D1Env

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const log = createApiLogger('memory:list:get', ctx)
  log.start()
  try {
    const { env } = ctx

    const setting = await dbFirst<{ value: string | null }>(env, `SELECT value FROM app_settings WHERE key = 'active_persona_id'`)
    let personaId: string | null = null
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value)
        personaId = typeof parsed === 'string' ? parsed : String(parsed)
      } catch {
        personaId = setting.value
      }
    }

    const [core, snaps, shorts] = await Promise.all([
      dbAll<CoreMemory>(env, `SELECT id, fact, importance FROM core_memories ORDER BY importance DESC LIMIT 3`),
      dbAll<{ id: string; tier: string; summary_text: string; key_facts: string }>(
        env,
        `SELECT id, tier, summary_text, key_facts FROM memory_snapshots ORDER BY period_end DESC LIMIT 5`,
      ),
      personaId
        ? dbAll<Pick<DbMessage, 'id' | 'content'>>(
            env,
            `SELECT id, content FROM messages WHERE role = 'user' AND persona_id = ? AND memory_tier = 'short' ORDER BY created_at DESC LIMIT 3`,
            [personaId],
          )
        : dbAll<Pick<DbMessage, 'id' | 'content'>>(
            env,
            `SELECT id, content FROM messages WHERE role = 'user' AND memory_tier = 'short' ORDER BY created_at DESC LIMIT 3`,
          ),
    ])

    const result: Array<{ id: string; tier: string; content: string }> = []
    for (const m of core ?? []) result.push({ id: m.id, tier: 'core', content: m.fact })
    for (const m of shorts ?? []) {
      const preview = m.content.length > 40 ? `${m.content.slice(0, 40)}...` : m.content
      result.push({ id: m.id, tier: 'short', content: preview })
    }
    for (const s of snaps ?? []) {
      let facts: string[] = []
      try {
        const parsed = JSON.parse(s.key_facts)
        facts = Array.isArray(parsed) ? parsed : []
      } catch {
        facts = []
      }
      const content = facts[0] ?? s.summary_text?.slice(0, 50) ?? ''
      result.push({ id: s.id, tier: s.tier, content })
    }

    log.ok({ personaId, count: result.length })
    return new Response(JSON.stringify(result), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    log.fail(e)
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
}
