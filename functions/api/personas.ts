// functions/api/personas.ts
// GET /api/personas - list personas
// POST /api/personas - create persona
// DELETE /api/personas?id=... - delete persona
// Uses Clerk for authentication + D1 for storage

import { createApiLogger } from '../../lib/api-log'
import { readTenantId, listPersonas, upsertPersona, deletePersona, D1Env, type D1Persona } from '../../lib/knowledgeos-d1'
import { verifyClerkToken } from '../../lib/api-middleware'
import { v4 as uuid } from 'crypto'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
  const log = createApiLogger('personas:get', ctx)
  log.start()

  try {
    // Verify Clerk JWT
    const authHeader = request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)
    log.info({ userId: user.userId })

    const tenantId = readTenantId(request)
    const personas = await listPersonas(env, tenantId)

    log.ok({ count: personas?.length || 0, tenantId })
    return json(personas || [])
  } catch (e) {
    log.fail(e)
    return json([])
  }
}

export const onRequestPost: PagesFunction<D1Env> = async ctx => {
  const { request, env } = ctx
  const log = createApiLogger('personas:post', ctx)
  log.start()

  try {
    // Verify Clerk JWT
    const authHeader = request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)
    log.info({ userId: user.userId })

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
    const now = new Date().toISOString()

    const persona: D1Persona = {
      id: `persona_${uuid()}`,
      tenant_id: tenantId,
      name: name.trim(),
      name_en: name_en?.trim() || null,
      avatar: avatar || '🌸',
      prompt: prompt || '',
      prompt_en: prompt_en?.trim() || null,
      reply_style: (reply_style || 'medium') as 'short' | 'medium' | 'long',
      voice_id: null,
      is_active: 0,
      created_at: now,
      updated_at: now,
    }

    const created = await upsertPersona(env, persona)

    if (!created) {
      log.fail('Failed to create persona', { stage: 'db' })
      return json({ error: '创建失败' }, 500)
    }

    log.ok({ personaId: created.id, tenantId })
    return json(created)
  } catch (e) {
    log.fail(e)
    return json({ error: '创建失败' }, 500)
  }
}

export const onRequestDelete: PagesFunction<D1Env> = async ctx => {
  const { request, env } = ctx
  const log = createApiLogger('personas:delete', ctx)
  log.start()

  try {
    // Verify Clerk JWT
    const authHeader = request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)
    log.info({ userId: user.userId })

    const id = new URL(request.url).searchParams.get('id')

    if (!id) {
      log.fail('id required', { stage: 'validate' })
      return json({ error: 'id 不能为空' }, 400)
    }

    const success = await deletePersona(env, id)

    if (!success) {
      log.fail('Failed to delete persona', { stage: 'db', id })
      return json({ error: '删除失败' }, 500)
    }

    log.ok({ id })
    return json({ success: true })
  } catch (e) {
    log.fail(e)
    return json({ error: '删除失败' }, 500)
  }
}
