// lib/workers-ai-client.ts
// Chat generation on Workers AI. Streams tokens through the same SSE shape the chat route already
// parses: `data: {"text": "..."}` per chunk and a final `data: {"done": true, "full": "..."}`.

// One conversation turn. "model" is the assistant role.
export interface ChatTurn {
  role: 'user' | 'model'
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>
}

export const DEFAULT_TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct'
export const DEFAULT_VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct'

export interface WorkersAiStreamOptions {
  model?: string
  maxOutputTokens?: number
  reqId?: string
}

type ChatMessage =
  | { role: 'system' | 'assistant'; content: string }
  | { role: 'user'; content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> }

export class WorkersAiQuotaError extends Error {}

// True when the error means the account has used up its daily Neuron allowance.
export function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /neuron|daily.*(limit|allocation)|allocation.*exceeded|quota/i.test(message)
}

function toChatMessages(systemPrompt: string, messages: ChatTurn[]): ChatMessage[] {
  const out: ChatMessage[] = [{ role: 'system', content: systemPrompt }]
  for (const message of messages) {
    if (message.role === 'model') {
      out.push({ role: 'assistant', content: message.parts.map(part => ('text' in part ? part.text : '')).join('') })
      continue
    }
    const hasImage = message.parts.some(part => 'inlineData' in part)
    if (!hasImage) {
      out.push({ role: 'user', content: message.parts.map(part => ('text' in part ? part.text : '')).join('') })
      continue
    }
    out.push({
      role: 'user',
      content: message.parts.map(part =>
        'inlineData' in part
          ? { type: 'image_url' as const, image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } }
          : { type: 'text' as const, text: part.text },
      ),
    })
  }
  return out
}

export async function streamWorkersAi(
  ai: Ai,
  systemPrompt: string,
  messages: ChatTurn[],
  opts: WorkersAiStreamOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const hasImage = messages.some(message => message.parts.some(part => 'inlineData' in part))
  const model = opts.model ?? (hasImage ? DEFAULT_VISION_MODEL : DEFAULT_TEXT_MODEL)
  const maxTokens = Math.max(64, Math.min(1024, opts.maxOutputTokens ?? 300))

  let upstream: unknown
  try {
    upstream = await ai.run(model, {
      messages: toChatMessages(systemPrompt, messages),
      max_tokens: maxTokens,
      stream: true,
    })
  } catch (error) {
    if (isQuotaError(error)) throw new WorkersAiQuotaError(error instanceof Error ? error.message : String(error))
    throw error
  }

  if (!(upstream instanceof ReadableStream)) {
    throw new Error('Workers AI did not return a stream')
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let lineBuffer = ''
  let fullText = ''
  let doneSent = false

  const emitDone = (ctrl: TransformStreamDefaultController<Uint8Array>) => {
    if (doneSent) return
    doneSent = true
    ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, full: fullText })}\n\n`))
  }

  // Workers AI streams `data: {"response": "..."}` lines and ends with `data: [DONE]`.
  const handleLine = (line: string, ctrl: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (!payload) return
    if (payload === '[DONE]') {
      emitDone(ctrl)
      return
    }
    try {
      const parsed = JSON.parse(payload) as { response?: string }
      if (parsed.response) {
        fullText += parsed.response
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: parsed.response })}\n\n`))
      }
    } catch {
      // ignore partial or malformed lines
    }
  }

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        lineBuffer += decoder.decode(chunk, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) handleLine(line.trim(), ctrl)
      },
      flush(ctrl) {
        if (lineBuffer.trim()) handleLine(lineBuffer.trim(), ctrl)
        emitDone(ctrl)
      },
    }),
  )
}
