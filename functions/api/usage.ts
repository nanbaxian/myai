import { createApiLogger } from '../../lib/api-log'
import { json, listTable, options, readTenantId } from './_knowledgeos-shared'

interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

export const onRequestOptions = options

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:usage:get', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const rows = await listTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'usage_logs', `tenant_id=eq.${tenantId}&order=date.desc&limit=31`)
  if (rows) {
    log.ok({ tenantId, count: rows.length })
    return json(rows)
  }
  log.ok({ tenantId, fallback: true })
  return json([])
}
