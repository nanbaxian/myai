// functions/api/persona.ts
// GET /api/persona - get active persona
// PUT /api/persona - update active persona
// Uses Clerk for authentication + D1 for storage

import { createApiLogger } from '../../lib/api-log'
import { readTenantId, getActivePersona, upsertPersona, D1Env, type D1Persona } from '../../lib/knowledgeos-d1'
import { verifyClerkToken } from '../../lib/api-middleware'

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

export const onRequestGet: PagesFunction<D1Env> = async ctx => {
  const { env, request } = ctx
  const log = createApiLogger('persona:get', ctx)
  log.start()
  try {
    const authHeader = request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)
    const tenantId = readTenantId(request)

    const persona = await getActivePersona(env, tenantId)
    log.ok({ hasPersona: Boolean(persona), tenantId })
    return json(persona || null)
  } catch (e) {
    log.fail(e)
    return json({ error: 'Failed to get active persona' }, 500)
  }
}

export const onRequestPut: PagesFunction<D1Env> = async ctx => {
  const { request, env } = ctx
  const log = createApiLogger('persona:put', ctx)
  log.start()
  try {
    const authHeader = request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)

    const body = (await request.json()) as Partial<D1Persona>
    const { name, name_en, avatar, prompt, prompt_en, reply_style } = body

    if (!name?.trim()) {
      log.fail('name required', { stage: 'validate' })
      return json({ error: '名字不能为空' }, 400)
    }

    if (prompt && prompt.length > 1000) {
      log.fail('prompt too long', { stage: 'validate' })
      return json({ error: '人设描述不能超过1000字' }, 400)
    }
    if (prompt_en && prompt_en.length > 1000) {
      log.fail('prompt_en too long', { stage: 'validate' })
      return json({ error: 'English persona prompt must be 1000 characters or fewer' }, 400)
    }

    const tenantId = readTenantId(request)
    const active = await getActivePersona(env, tenantId)

    if (!active) {
      log.fail('no active persona', { stage: 'validate' })
      return json({ error: '没有激活的人设' }, 400)
    }

    const now = new Date().toISOString()
    const updated: D1Persona = {
      ...active,
      name: name.trim(),
      name_en: name_en?.trim() || null,
      avatar: avatar || active.avatar,
      prompt: prompt || active.prompt,
      prompt_en: prompt_en?.trim() || null,
      reply_style: (reply_style || active.reply_style) as 'short' | 'medium' | 'long',
      updated_at: now,
    }

    const result = await upsertPersona(env, updated)

    if (!result) {
      log.fail('Failed to update persona', { stage: 'db' })
      return json({ error: '更新失败' }, 500)
    }

    log.ok({ personaId: result.id, tenantId })
    return json(result)
  } catch (e) {
    log.fail(e)
    return json({ error: '更新失败' }, 500)
  }
}
