import { createApiLogger } from '../../lib/api-log'
import { json, listTable, mutateTable, options, readTenantId } from './_knowledgeos-shared'

interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

export const onRequestOptions = options

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:members:get', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const rows = await listTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'tenant_members', `tenant_id=eq.${tenantId}&order=created_at.asc`)
  if (rows) {
    log.ok({ tenantId, count: rows.length })
    return json(rows)
  }
  log.ok({ tenantId, fallback: true })
  return json([])
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:members:post', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const body = await ctx.request.json().catch(() => ({})) as Record<string, unknown>
  const payload = {
    tenant_id: tenantId,
    user_id: String(body.user_id || `user_${Date.now()}`),
    role: String(body.role || 'member'),
    invited_at: new Date().toISOString(),
    joined_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const rows = await mutateTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'tenant_members', 'POST', payload)
  if (rows?.[0]) {
    log.ok({ tenantId, userId: payload.user_id })
    return json(rows[0], 201)
  }
  log.ok({ tenantId, fallback: true })
  return json(payload, 201)
}
