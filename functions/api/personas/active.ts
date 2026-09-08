// functions/api/personas/active.ts
// GET /api/personas/active  PUT /api/personas/active
// Uses Clerk for authentication + Cloudflare D1 for storage

import { createApiLogger } from '../../../lib/api-log'
import { readTenantId, getActivePersona, setActivePersona, D1Env, type D1Persona } from '../../../lib/knowledgeos-d1'
import { verifyClerkToken } from '../../../lib/api-middleware'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestGet: PagesFunction<D1Env> = async (ctx) => {
  const { env, request } = ctx
  const log = createApiLogger('personas:active:get', ctx)
  log.start()

  try {
    // Verify Clerk JWT
    const authHeader = request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)
    log.info({ userId: user.userId })

    // Get tenant ID from header or query
    const tenantId = readTenantId(request)

    // Get active persona from D1
    const persona = await getActivePersona(env, tenantId)

    log.ok({ personaId: persona?.id || null, tenantId })
    return json(persona || null)
  } catch (e) {
    log.fail(e)
    return json({ error: 'Failed to get active persona' }, 500)
  }
}

export const onRequestPut: PagesFunction<D1Env> = async (ctx) => {
  const { env, request } = ctx
  const log = createApiLogger('personas:active:put', ctx)
  log.start()

  try {
    // Verify Clerk JWT
    const authHeader = request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)
    log.info({ userId: user.userId })

    const body = (await request.json()) as { persona_id?: string }

    if (!body.persona_id) {
      log.fail('persona_id required', { stage: 'validate' })
      return json({ error: 'persona_id is required' }, 400)
    }

    const tenantId = readTenantId(request)

    // Set active persona in D1
    const updated = await setActivePersona(env, tenantId, body.persona_id)

    if (!updated) {
      log.fail('Failed to update persona', { stage: 'db' })
      return json({ error: 'Failed to update active persona' }, 500)
    }

    log.ok({ personaId: updated.id, tenantId })
    return json({ success: true, persona: updated })
  } catch (e) {
    log.fail(e)
    return json({ error: 'Failed to update active persona' }, 500)
  }
}

