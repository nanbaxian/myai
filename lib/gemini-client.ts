// lib/gemini-client.ts
// Gemini Flash 1.5 — Workers Runtime，纯 fetch，流式 SSE
// 修复：① SSE 跨 chunk buffer ② done 事件只发一次

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>
}

function extractTextParts(parsed: unknown): string {
  const parts = (parsed as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .map(p => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('')
}

export async function streamGemini(
  apiKey: string,
  systemPrompt: string,
  messages: GeminiMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
      generationConfig: { maxOutputTokens: 600, temperature: 0.9, topP: 0.95 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  })

  const encoder = new TextEncoder()

  if (!upstream.ok) {
    const err = await upstream.text()
    return new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err })}\n\n`))
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, full: '' })}\n\n`))
        ctrl.close()
      },
    })
  }

  let fullText    = ''
  let doneSent    = false
  let lineBuffer  = ''         // ← 修复：跨 chunk 行缓冲

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      lineBuffer += new TextDecoder().decode(chunk)

      // 只处理完整的行（以 \n 结尾），剩余不完整部分留在 buffer
      const lines = lineBuffer.split('\n')
      lineBuffer  = lines.pop() ?? ''  // 最后一个可能不完整，留着

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw || raw === '[DONE]') continue
        try {
          const parsed = JSON.parse(raw)
          const piece = extractTextParts(parsed)
          if (piece) {
            fullText += piece
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: piece })}\n\n`))
          }
          // finishReason 检查：STOP 正常结束，MAX_TOKENS 超长，SAFETY/RECITATION 内容被过滤
          const finishReason: string = parsed?.candidates?.[0]?.finishReason ?? ''
          if (finishReason && !doneSent) {
            if ((finishReason === 'SAFETY' || finishReason === 'RECITATION') && !fullText) {
              // 内容被安全过滤且没有任何输出，发一个友好提示
              const safetyMsg = '（这个话题我不太方便回答，换个话题聊聊？）'
              fullText = safetyMsg
              ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: safetyMsg })}\n\n`))
            }
            if (!fullText) {
              const fallbackMsg = '我这边暂时没有生成出内容，换个说法再试试。'
              fullText = fallbackMsg
              ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackMsg })}\n\n`))
            }
            doneSent = true
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, full: fullText })}\n\n`))
          }
        } catch { /* 解析失败跳过 */ }
      }
    },
    flush(ctrl) {
      // 处理 buffer 里剩余的最后一行（如果有）
      if (lineBuffer.startsWith('data: ')) {
        const raw = lineBuffer.slice(6).trim()
        if (raw && raw !== '[DONE]') {
          try {
            const parsed = JSON.parse(raw)
            const piece = extractTextParts(parsed)
            if (piece) {
              fullText += piece
              ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: piece })}\n\n`))
            }
          } catch {}
        }
      }
      // 只有 finishReason 没触发过时才在 flush 里补发 done（兜底）
      if (!doneSent) {
        if (!fullText) {
          const fallbackMsg = '我这边暂时没有生成出内容，换个说法再试试。'
          fullText = fallbackMsg
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackMsg })}\n\n`))
        }
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, full: fullText })}\n\n`))
      }
    },
  })

  return upstream.body!.pipeThrough(transform)
}
