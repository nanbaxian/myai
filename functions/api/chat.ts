// functions/api/chat.ts
// POST /api/chat — 流式对话，支持图片

import { loadMemoryContext, saveMessage } from '../../lib/memory-engine'
import { buildSystemPrompt, buildMessageHistory } from '../../lib/context-builder'
import { streamGemini } from '../../lib/gemini-client'
import type { Persona } from '../../types/index'

interface Env {
  BUCKET: R2Bucket

  GEMINI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  AI: Ai  // Workers AI binding — @cf/baai/bge-m3 向量嵌入（1024维）
}


async function r2ImageUrlToBase64(env: Env, imageUrl: string): Promise<{ base64: string; mime: string } | null> {
  // Expect /r2/<key>
  const m = imageUrl.match(/^\/r2\/([A-Za-z0-9\-]+)$/)
  if (!m) return null
  const key = m[1]
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { message?: string; imageBase64?: string }
  try { body = await request.json() }
  catch { return errJson('请求格式错误', 400) }

  const { message = '', imageBase64 } = body
  if (!message && !imageBase64) return errJson('消息不能为空', 400)

  const sbUrl = env.SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_KEY

  // ① 取活跃人设（先查 app_settings，再回退到第一个）
  const persona = await getActivePersona(sbUrl, sbKey)
  if (!persona) return errJson('未找到人设配置', 500)

  // ② 加载记忆（传入当前消息做语义搜索，优先用 Workers AI binding 生成向量）
  const memory = await loadMemoryContext(sbUrl, sbKey, message || undefined, env.GEMINI_API_KEY, persona.id, env.AI)

  // ③ 构建 prompt 和消息历史
  const systemPrompt = buildSystemPrompt(persona, memory)
  const messages     = buildMessageHistory(memory, message, imageBase64)

  // ④ 异步保存用户消息（不阻塞流式）
  const saveUserMsg = saveMessage(sbUrl, sbKey, 'user',
    message || '（发送了图片）',
    { content_type: imageBase64 ? 'image' : 'text', persona_id: persona.id }
  ).catch(e => console.error('[save user msg]', e))

  // ⑤ 调用 Gemini 流式
  const geminiStream = await streamGemini(env.GEMINI_API_KEY, systemPrompt, messages)

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
            if (d.done && !savedAi) {
              savedAi = true
              saveUserMsg.then(() =>
                saveMessage(sbUrl, sbKey, 'assistant', fullText || '...', { persona_id: persona.id })
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
            saveUserMsg.then(() =>
              saveMessage(sbUrl, sbKey, 'assistant', fullText || '...', { persona_id: persona.id })
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
