import { createApiLogger } from '../../lib/api-log'
import { json, listTable, mutateTable, options, readTenantId } from './_knowledgeos-shared'

interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

export const onRequestOptions = options

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:sources:get', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const rows = await listTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'data_sources', `tenant_id=eq.${tenantId}&order=created_at.desc`)
  if (rows) {
    log.ok({ tenantId, count: rows.length })
    return json(rows)
  }
  log.ok({ tenantId, fallback: true })
  return json([])
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:sources:post', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const body = await ctx.request.json().catch(() => ({})) as Record<string, unknown>
  const payload = {
    id: `source_${Date.now()}`,
    tenant_id: tenantId,
    bot_id: body.bot_id ?? null,
    type: String(body.type || 'website'),
    name: String(body.name || 'New source'),
    config_json: body.config_json && typeof body.config_json === 'object' ? body.config_json : {},
    status: String(body.status || 'draft'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const rows = await mutateTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'data_sources', 'POST', payload)
  if (rows?.[0]) {
    log.ok({ tenantId, sourceId: String(rows[0].id ?? payload.id) })
    return json(rows[0], 201)
  }
  log.ok({ tenantId, fallback: true })
  return json(payload, 201)
}
