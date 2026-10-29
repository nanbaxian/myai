const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id',
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

export function options(): Response {
  return new Response(null, { headers: cors })
}

export function readTenantId(request: Request): string {
  const header = request.headers.get('x-tenant-id')?.trim()
  if (header) return header
  const url = new URL(request.url)
  const query = url.searchParams.get('tenant_id')?.trim()
  if (query) return query
  return 'tenant_demo'
}

export function demoTenant(tenantId: string) {
  return {
    id: tenantId,
    name: 'KnowledgeOS Demo Tenant',
    slug: 'knowledgeos-demo',
    plan: 'starter',
    status: 'active',
    created_at: new Date().toISOString(),
  }
}
