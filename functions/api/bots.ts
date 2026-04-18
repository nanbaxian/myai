import { createApiLogger } from '../../lib/api-log'
import { json, listTable, mutateTable, options, readTenantId } from './_knowledgeos-shared'

interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

export const onRequestOptions = options

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:bots:get', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const rows = await listTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'bots', `tenant_id=eq.${tenantId}&order=created_at.asc`)
  if (rows) {
    log.ok({ tenantId, count: rows.length })
    return json(rows)
  }
  log.ok({ tenantId, fallback: true })
  return json([
    {
      id: 'bot_demo',
      tenant_id: tenantId,
      name: 'KnowledgeOS Assistant',
      persona: 'Professional and concise',
      tone: 'concise',
      welcome_msg: 'Hello, how can I help?',
      fallback_msg: 'I could not find a matching source.',
      language: 'zh-CN',
      settings_json: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:bots:post', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const body = await ctx.request.json().catch(() => ({})) as Record<string, unknown>
  const payload = {
    id: `bot_${Date.now()}`,
    tenant_id: tenantId,
    name: String(body.name || 'KnowledgeOS Assistant'),
    persona: String(body.persona || 'Professional'),
    tone: String(body.tone || 'concise'),
    welcome_msg: String(body.welcome_msg || 'Hello, how can I help?'),
    fallback_msg: String(body.fallback_msg || 'I could not find a matching source.'),
    language: String(body.language || 'zh-CN'),
    settings_json: body.settings_json && typeof body.settings_json === 'object' ? body.settings_json : {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const rows = await mutateTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'bots', 'POST', payload)
  if (rows?.[0]) {
    log.ok({ tenantId, botId: String(rows[0].id ?? payload.id) })
    return json(rows[0], 201)
  }
  log.ok({ tenantId, fallback: true })
  return json(payload, 201)
}
