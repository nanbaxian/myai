// functions/api/voice.ts
// POST /api/voice  — STT (Deepgram)
// GET  /api/voice?text=xxx  — TTS (Free: Google TTS | Pro: ElevenLabs)
//
// ✅ 本版改造：按 Supabase Auth 的 user_id 计费/限额
// - Free：每日 10 分钟（KV 记录 used seconds，key = voice:{userId}:{YYYY-MM-DD}）
// - Pro ：默认不限制（从 Supabase 表 user_plans 读取）
//
// 认证：
// - 必须携带 Authorization: Bearer <supabase access_token>
// - 后端使用 JWKS 验签（/auth/v1/certs）

import { verifySupabaseJwt } from '@/lib/auth'
import { getUserPlan } from '@/lib/plan'
import { quotaKey, getUsedSeconds, addUsedSeconds, FREE_DAILY_SECONDS } from '@/lib/voice-quota'

interface Env {
  BUCKET: R2Bucket

  // Free tier
  DEEPGRAM_API_KEY: string
  GOOGLE_TTS_API_KEY: string

  // Pro tier
  ELEVENLABS_API_KEY?: string
  ELEVENLABS_VOICE_ID?: string

  // Supabase
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  SUPABASE_JWT_ISS?: string
  SUPABASE_JWT_AUD?: string

  // Quota storage
  VOICE_KV: KVNamespace
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-audio-duration-ms',
}

function jsonError(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function withQuotaHeaders(resp: Response, plan: 'free' | 'pro', remaining?: number): Response {
  const h = new Headers(resp.headers)
  h.set('Access-Control-Allow-Origin', cors['Access-Control-Allow-Origin'])
  h.set('X-Voice-Plan', plan)
  if (typeof remaining === 'number') h.set('X-Voice-Remaining-Seconds', String(remaining))
  return new Response(resp.body, { status: resp.status, headers: h })
}

// ================================================
// POST /api/voice — 语音转文字（Deepgram）
// ================================================
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Auth required
  let userId = ''
  try {
    const u = await verifySupabaseJwt(request, env)
    userId = u.userId
  } catch {
    return jsonError('未登录：请使用 Magic Link 登录后再试', 401)
  }

  const plan = await getUserPlan(env, userId)
  const key = quotaKey(userId)

    const ct = request.headers.get('content-type') || ''
  let audioArrayBuffer: ArrayBuffer | null = null
  let durationSeconds = 0

  if (ct.includes('application/json')) {
    const body = await request.json().catch(() => null as any)
    const audioUrl = body?.audioUrl as string | undefined
    durationSeconds = Number(body?.durationSeconds || 0)

    if (!audioUrl) return jsonError('缺少 audioUrl', 400)
    const mm = audioUrl.match(/^\/r2\/([A-Za-z0-9\-]+)$/)
    if (!mm) return jsonError('audioUrl 格式不正确', 400)
    const obj = await env.BUCKET.get(mm[1])
    if (!obj) return jsonError('音频不存在', 404)
    audioArrayBuffer = await obj.arrayBuffer()
  } else {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return jsonError('请求格式错误，需要 multipart/form-data 或 application/json', 400)
    }
    const audioFile = formData.get('audio') as File | null
    if (!audioFile) return jsonError('未收到音频文件', 400)
    const durationMs = Number(request.headers.get('x-audio-duration-ms') || 0)
    durationSeconds = Math.ceil(Math.max(1, durationMs) / 1000)
    audioArrayBuffer = await audioFile.arrayBuffer()
  }


  const audioFile = formData.get('audio') as File | null
  if (!audioFile) return jsonError('未收到音频文件', 400)

  // Free 配额检查
  let remaining = 0
  if (plan === 'free') {
    const used = await getUsedSeconds(env.VOICE_KV, key)
    remaining = Math.max(0, FREE_DAILY_SECONDS - used)
    if (remaining <= 0) {
      return withQuotaHeaders(jsonError('今日语音体验已用完（免费用户每日 10 分钟）', 402), plan, 0)
    }
  }

  // 时长（ms）：优先前端上报；否则按 30s 估算
  const durMsHeader = request.headers.get('x-audio-duration-ms')
  const durMs = durMsHeader ? Number(durMsHeader) : NaN
  const audioSeconds = Number.isFinite(durMs) && durMs > 0
    ? Math.min(600, Math.max(1, Math.ceil(durMs / 1000))) // 单次最多计 10 分钟
    : 30

  // Deepgram ASR
  const mimeType = audioFile.type || 'audio/webm'
  const dgUrl = new URL('https://api.deepgram.com/v1/listen')
  dgUrl.searchParams.set('model', 'nova-2')
  dgUrl.searchParams.set('smart_format', 'true')
  dgUrl.searchParams.set('punctuate', 'true')
  dgUrl.searchParams.set('language', 'zh')
  dgUrl.searchParams.set('filler_words', 'false')

  const dgRes = await fetch(dgUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
      'Content-Type': mimeType,
    },
    body: audioArrayBuffer as any
    }),
  })

  if (!dgRes.ok) {
    console.error('[deepgram]', await dgRes.text())
    return jsonError('语音识别失败', 500)
  }

  const dgJson = await dgRes.json() as any
  const text = dgJson?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

  // 计费：free 扣配额
  if (plan === 'free') {
    const r = await addUsedSeconds(env.VOICE_KV, key, audioSeconds)
    remaining = r.remaining
  }

  const res = new Response(JSON.stringify({ text: String(text).trim() }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
  return withQuotaHeaders(res, plan, plan === 'free' ? remaining : undefined)
}

// ================================================
// GET /api/voice?text=xxx — 文字转语音
// Free：Google TTS
// Pro ：ElevenLabs
// ================================================
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  // Auth required
  let userId = ''
  try {
    const u = await verifySupabaseJwt(request, env)
    userId = u.userId
  } catch {
    return jsonError('未登录：请使用 Magic Link 登录后再试', 401)
  }

  const plan = await getUserPlan(env, userId)
  const key = quotaKey(userId)

  const u = new URL(request.url)
  const text = u.searchParams.get('text')
  if (!text) return jsonError('text 参数不能为空', 400)

  // Free 配额检查
  let remaining = 0
  if (plan === 'free') {
    const used = await getUsedSeconds(env.VOICE_KV, key)
    remaining = Math.max(0, FREE_DAILY_SECONDS - used)
    if (remaining <= 0) {
      return withQuotaHeaders(jsonError('今日语音体验已用完（免费用户每日 10 分钟）', 402), plan, 0)
    }
  }

  // 估算 TTS 时长：900 chars / min
  const chars = text.length
  const estSeconds = Math.max(1, Math.min(180, Math.ceil((chars / 900) * 60)))

  // Pro：优先 ElevenLabs（若未配置则回退 Google）
  if (plan === 'pro' && env.ELEVENLABS_API_KEY) {
    const voiceId = env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // ElevenLabs 常用默认
    const elUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`
    const elRes = await fetch(elUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.slice(0, 1200),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
    })

    if (elRes.ok) {
      const resp = new Response(elRes.body, {
        headers: {
          ...cors,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      })
      return withQuotaHeaders(resp, plan)
    }

    console.error('[elevenlabs]', await elRes.text())
    // 失败回退 Google
  }

  // Free：Google TTS
  const ggUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${env.GOOGLE_TTS_API_KEY}`
  const ggRes = await fetch(ggUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: text.slice(0, 1200) },
      voice: {
        languageCode: 'zh-CN',
        name: 'zh-CN-Standard-A',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
      },
    }),
  })

  if (!ggRes.ok) {
    console.error('[google tts]', await ggRes.text())
    return jsonError('语音合成失败', 500)
  }

  const ggJson = await ggRes.json() as { audioContent?: string }
  const b64 = ggJson.audioContent
  if (!b64) return jsonError('语音合成失败：空返回', 500)

  // free 扣配额
  if (plan === 'free') {
    const r = await addUsedSeconds(env.VOICE_KV, key, estSeconds)
    remaining = r.remaining
  }

  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const resp = new Response(bin, {
    headers: {
      ...cors,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })

  return withQuotaHeaders(resp, plan, plan === 'free' ? remaining : undefined)
}

export const onRequestOptions = (): Response => new Response(null, { headers: cors })
