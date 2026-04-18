import { createApiLogger } from '../../lib/api-log'
import { json, listTable, mutateTable, options, readTenantId } from './_knowledgeos-shared'

interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

export const onRequestOptions = options

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:documents:get', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const rows = await listTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'documents', `tenant_id=eq.${tenantId}&order=created_at.desc`)
  if (rows) {
    log.ok({ tenantId, count: rows.length })
    return json(rows)
  }
  log.ok({ tenantId, fallback: true })
  return json([])
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const log = createApiLogger('knowledgeos:documents:post', ctx)
  log.start()
  const tenantId = readTenantId(ctx.request)
  const body = await ctx.request.json().catch(() => ({})) as Record<string, unknown>
  const payload = {
    id: `doc_${Date.now()}`,
    tenant_id: tenantId,
    source_id: body.source_id ?? null,
    title: String(body.title || 'Untitled document'),
    file_name: body.file_name ?? null,
    r2_key: body.r2_key ?? null,
    status: String(body.status || 'uploaded'),
    error_msg: body.error_msg ?? null,
    version: Number(body.version || 1),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
  const rows = await mutateTable(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_SERVICE_KEY, 'documents', 'POST', payload)
  if (rows?.[0]) {
    log.ok({ tenantId, docId: String(rows[0].id ?? payload.id) })
    return json(rows[0], 201)
  }
  log.ok({ tenantId, fallback: true })
  return json(payload, 201)
}
