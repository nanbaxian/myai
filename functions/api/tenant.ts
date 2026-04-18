import { createApiLogger } from '../../lib/api-log'
import { demoTenant, json, listTable, mutateTable, options, readTenantId } from './_knowledgeos-shared'

interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

export const onRequestOptions = options

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:tenant:get', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const rows = await listTable<{ id: string; name: string }>(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'tenants', `id=eq.${tenantId}&limit=1`)
  if (rows?.[0]) {
    log.ok({ tenantId })
    return json(rows[0])
  }
  log.ok({ tenantId, fallback: true })
  return json(demoTenant(tenantId))
}

export const onRequestPatch: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:tenant:patch', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const body = await ctx.request.json().catch(() => ({})) as Record<string, unknown>
  const merged = { ...demoTenant(tenantId), ...body, id: tenantId, updated_at: new Date().toISOString() }
  const rows = await mutateTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'tenants', 'PATCH', merged, `id=eq.${tenantId}`)
  if (rows?.[0]) {
    log.ok({ tenantId })
    return json(rows[0])
  }
  log.ok({ tenantId, fallback: true })
  return json(merged)
}
