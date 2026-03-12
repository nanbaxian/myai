// functions/api/chat.ts
// POST /api/chat — 流式对话，支持图片

import { loadMemoryContext, saveMessage } from '../../lib/memory-engine'
import { buildSystemPrompt, buildMessageHistory } from '../../lib/context-builder'
import { streamGemini, streamGeminiFlashLite } from '../../lib/gemini-client'
import { syncChatSessionFromMessages } from '../../lib/chat-history'
import type { Persona, ReplyLanguage } from '../../types/index'
import { createApiLogger } from '../../lib/api-log'
import { localizePersonaForReplyLanguage } from '../../lib/persona-localization'

interface Env {
  BUCKET: R2Bucket

  DEEPINFRA_API_KEY: string
  GEMINI_API_KEY?: string
  GEMINI_VISION_MODEL?: string
  VOICE_FAST_MODEL?: string
  DEEPINFRA_MODEL?: string
  DEEPINFRA_MAX_TOKENS?: string
  DEEPINFRA_COALESCE_CHARS?: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  AI: Ai  // Workers AI binding — @cf/baai/bge-m3 向量嵌入（1024维）
}


function extractR2KeyFromUrl(imageUrl: string): string | null {
  let path = imageUrl
  try {
    if (/^https?:\/\//i.test(imageUrl)) path = new URL(imageUrl).pathname
  } catch {
    return null
  }
  const m = path.match(/^\/r2\/([A-Za-z0-9\-]+)$/)
  if (!m) return null
  return m[1]
}

async function r2ImageUrlToBase64(env: Env, imageUrl: string): Promise<{ base64: string; mime: string } | null> {
  const key = extractR2KeyFromUrl(imageUrl)
  if (!key) return null
  const obj = await env.BUCKET.get(key)
  if (!obj) return null
  const mime = obj.httpMetadata?.contentType || 'image/png'
  const buf = await obj.arrayBuffer()
  // Convert to base64 (Workers runtime supports btoa on binary string)
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const base64 = btoa(binary)
  return { base64, mime }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx
  const apiLog = createApiLogger('chat:post', ctx)
  const reqId = apiLog.reqId
  const startedAt = Date.now()
  const debug = true
  apiLog.start({ debug })
  console.log(`[chat ${reqId}] request_start debug=${debug}`)
  let body: {
    message?: string
    imageBase64?: string
    imageUrl?: string
    replyLanguage?: ReplyLanguage
    session_id?: string
    voice_mode?: boolean
  }
  try { body = await request.json() }
  catch (e) {
    apiLog.fail(e, { stage: 'parse' })
    return errJson('请求格式错误', 400)
  }

  const { message = '', imageUrl, session_id } = body
  const voiceMode = body.voice_mode === true
  let { imageBase64 } = body
  const replyLanguage: ReplyLanguage =
    body.replyLanguage === 'en' || body.replyLanguage === 'zh'
      ? body.replyLanguage
      : 'zh'
  if (!imageBase64 && imageUrl) {
    const r2 = await r2ImageUrlToBase64(env, imageUrl)
    if (r2?.base64) imageBase64 = r2.base64
  }
  if (!message && !imageBase64) {
    apiLog.fail('empty message and image', { stage: 'validate' })
    return errJson('消息不能为空', 400)
  }
  const hasImage = Boolean(imageBase64)
  if (debug) {
    console.log(
      `[chat ${reqId}] in message_len=${message.length} has_image=${hasImage} lang=${replyLanguage} voice_mode=${voiceMode}`
    )
  }

  const sbUrl = env.SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_KEY

  // ① 取活跃人设（先查 app_settings，再回退到第一个）
  const persona = localizePersonaForReplyLanguage(await getActivePersona(sbUrl, sbKey), replyLanguage)
  if (!persona) {
    apiLog.fail('active persona not found', { stage: 'persona' })
    return errJson('未找到人设配置', 500)
  }

  // ② 加载记忆（传入当前消息做语义搜索，优先用 Workers AI binding 生成向量）
  const memory = await loadMemoryContext(sbUrl, sbKey, message || undefined, env.DEEPINFRA_API_KEY, persona.id, env.AI)
  // Stabilize turn-following: only keep short-term dialogue context for generation.
  const memoryForPrompt = {
    ...memory,
    coreMemories: [],
    midTermSummary: [],
    longTermFragments: [],
  }

  // ③ 构建 prompt 和消息历史
  const hardLanguageRule = replyLanguage === 'en'
    ? '\n\n# Hard Language Lock\n- You must reply entirely in English.\n- Do not use Chinese characters.\n- Do not call the user by the assistant persona name.'
    : '\n\n# Hard Language Lock\n- 你必须完全使用简体中文回复。\n- 不要使用英文句子（专有名词除外）。\n- 不要把助手人设名字当作用户称呼。'
  const voiceFastReplyRule = voiceMode
    ? (
        replyLanguage === 'en'
          ? '\n\n# Voice Fast Reply Mode\n- This reply is for live voice conversation.\n- Hard limit: reply in 1 short sentence when possible, never more than 2 short sentences.\n- Keep the total output very short and easy to speak aloud.\n- Prioritize immediate, natural spoken wording.\n- Avoid lists, preambles, hedging, and long explanations.\n- If the user asks a complex question, answer only the core point first in the shortest useful way.'
          : '\n\n# Voice Fast Reply Mode\n- 这是实时语音对话回复。\n- 硬限制：尽量只回 1 句短句，最多 2 句短句。\n- 总长度必须非常短，便于直接说出口。\n- 以口语自然、立刻能说出口为第一优先级。\n- 不要列点，不要铺垫，不要犹豫式废话，不要长解释。\n- 如果问题复杂，只先回答核心点，用最短方式说清。'
      )
    : ''
  const systemPrompt = buildSystemPrompt(persona, memoryForPrompt, message || '', replyLanguage) + hardLanguageRule + voiceFastReplyRule
  const messages     = buildMessageHistory(memoryForPrompt, message, imageBase64)
  if (debug) {
    console.log(
      `[chat ${reqId}] persona=${persona.id} short=${memory.shortTermMessages.length} ` +
      `core=${memory.coreMemories.length} sem=${memory.semanticMatches.length} history=${messages.length}`
    )
  }

  // ④ 异步保存用户消息（不阻塞流式）
  const saveUserMsg = saveMessage(sbUrl, sbKey, 'user',
    message || '（发送了图片）',
    {
      content_type: imageBase64 ? 'image' : 'text',
      image_url: imageUrl,
      persona_id: persona.id,
      session_id,
    }
  ).catch(e => console.error('[save user msg]', e))

  if (session_id) {
    saveUserMsg
      .then(() =>
        syncChatSessionFromMessages(sbUrl, sbKey, session_id, {
          persona_id: persona.id,
          session_type: voiceMode ? 'voice' : 'text',
          fallbackTitle: message,
        }),
      )
      .catch(e => console.error('[sync session after user msg]', e))
  }

  // ⑤ 调用 Gemini 流式
  const maxOutputTokens = voiceMode
    ? 48
    : Number.parseInt(env.DEEPINFRA_MAX_TOKENS || '', 10)
  const coalesceChars = voiceMode
    ? 4
    : Number.parseInt(env.DEEPINFRA_COALESCE_CHARS || '', 10)
  const deepinfraModel = voiceMode
    ? (env.VOICE_FAST_MODEL || env.DEEPINFRA_MODEL || 'meta-llama/Llama-3.2-3B-Instruct')
    : (env.DEEPINFRA_MODEL || 'meta-llama/Llama-3.2-3B-Instruct')
  const visionModel = env.GEMINI_VISION_MODEL || 'gemini-2.5-flash-lite'
  const provider = hasImage ? 'gemini' : 'deepinfra'
  if (debug) {
    console.log(
      `[chat ${reqId}] provider=${provider} model=${hasImage ? visionModel : deepinfraModel} ` +
      `max_tokens=${Number.isFinite(maxOutputTokens) ? maxOutputTokens : 'default'} ` +
      `coalesce=${Number.isFinite(coalesceChars) ? coalesceChars : 'default'} ` +
      `prep_ms=${Date.now() - startedAt}`
    )
  }
  let geminiStream: ReadableStream<Uint8Array>
  try {
    if (hasImage) {
      if (!env.GEMINI_API_KEY) {
        apiLog.fail('missing GEMINI_API_KEY', { stage: 'model', provider: 'gemini' })
        return errJson('缺少 GEMINI_API_KEY（图片分析需要 Gemini 2.5 Flash-Lite）', 500)
      }
      geminiStream = await streamGeminiFlashLite(env.GEMINI_API_KEY, systemPrompt, messages, {
        debug,
        reqId,
        model: visionModel,
        maxOutputTokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : undefined,
        coalesceChars: Number.isFinite(coalesceChars) ? coalesceChars : undefined,
      })
    } else {
      geminiStream = await streamGemini(env.DEEPINFRA_API_KEY, systemPrompt, messages, {
        debug,
        reqId,
        model: deepinfraModel,
        maxOutputTokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : undefined,
        coalesceChars: Number.isFinite(coalesceChars) ? coalesceChars : undefined,
      })
    }
  } catch (e) {
    apiLog.fail(e, { stage: 'model', provider })
    return errJson('模型调用失败', 500)
  }

  // ⑥ 拦截流 → 捕获完整回复后保存 AI 消息
  let fullText  = ''
  let savedAi   = false
  let chatBuffer = ''   // 跨 chunk 行缓冲，防止 done 事件被截断

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      ctrl.enqueue(chunk)
      try {
        chatBuffer += new TextDecoder().decode(chunk)
        const lines = chatBuffer.split('\n')
        chatBuffer  = lines.pop() ?? ''   // 保留不完整最后一行
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.text)             fullText += d.text
            if (debug && d.error)   console.error(`[chat ${reqId}] stream_error=${String(d.error).slice(0, 300)}`)
            if (d.done && !savedAi) {
              savedAi = true
              if (debug) console.log(`[chat ${reqId}] done full_len=${fullText.length}`)
              apiLog.ok({ personaId: persona.id, fullLen: fullText.length })
              saveUserMsg.then(() =>
                saveMessage(sbUrl, sbKey, 'assistant', fullText || '...', {
                  persona_id: persona.id,
                  session_id,
                })
                  .then(() => {
                    if (!session_id) return
                    return syncChatSessionFromMessages(sbUrl, sbKey, session_id, {
                      persona_id: persona.id,
                      session_type: voiceMode ? 'voice' : 'text',
                      fallbackTitle: message,
                    })
                  })
                  .catch(e => console.error('[save ai msg]', e))
              )
            }
          } catch { /* 单行解析失败跳过 */ }
        }
      } catch { /* chunk 解码失败忽略 */ }
    },
    flush() {
      // 处理 buffer 中可能剩余的最后一行
      if (chatBuffer.startsWith('data: ') && !savedAi) {
        try {
          const d = JSON.parse(chatBuffer.slice(6))
          if (d.done && !savedAi) {
            savedAi = true
            if (debug) console.log(`[chat ${reqId}] done@flush full_len=${fullText.length}`)
            apiLog.ok({ personaId: persona.id, fullLen: fullText.length, source: 'flush' })
            saveUserMsg.then(() =>
              saveMessage(sbUrl, sbKey, 'assistant', fullText || '...', {
                persona_id: persona.id,
                session_id,
              })
                .then(() => {
                  if (!session_id) return
                  return syncChatSessionFromMessages(sbUrl, sbKey, session_id, {
                    persona_id: persona.id,
                    session_type: voiceMode ? 'voice' : 'text',
                    fallbackTitle: message,
                  })
                })
                .catch(e => console.error('[save ai msg flush]', e))
            )
          }
        } catch {}
      }
    },
  })

  return new Response(geminiStream.pipeThrough(transform), {
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Debug-Gemini': debug ? '1' : '0',
      'X-Req-Id': reqId,
    },
  })
}

// 取活跃人设（同 personas/active GET 逻辑，内联避免内部 HTTP 调用）
async function getActivePersona(supabaseUrl: string, key: string): Promise<Persona | null> {
  try {
    const h = sbHeaders(key)
    const settingRes = await fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.active_persona_id`, { headers: h })
    let personaId: string | null = null
    if (settingRes.ok) {
      const [setting] = await settingRes.json() as Array<{ value: unknown }>
      if (setting?.value) {
        const v = setting.value
        personaId = typeof v === 'string' ? (() => { try { return JSON.parse(v) } catch { return v } })() : String(v)
      }
    }

    const url = personaId
      ? `${supabaseUrl}/rest/v1/personas?id=eq.${personaId}&limit=1`
      : `${supabaseUrl}/rest/v1/personas?limit=1`

    const res = await fetch(url, { headers: h })
    if (!res.ok) return null
    const [persona] = await res.json() as Persona[]
    // 若 personaId 指向已删除的人设，回退到第一个
    if (!persona && personaId) {
      const fallback = await fetch(`${supabaseUrl}/rest/v1/personas?limit=1`, { headers: h })
      if (!fallback.ok) return null
      const [p] = await fallback.json() as Persona[]
      return p ?? null
    }
    return persona ?? null
  } catch {
    return null
  }
}

function sbHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

function errJson(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
