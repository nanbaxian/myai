// lib/context-builder.ts
// Central prompt and message-history builders.

import type { Persona, MemoryContext, MemorySnapshot, DbMessage, ReplyLanguage } from '../types/index'

export type { Persona }

// ================================================
// Build System Prompt
// ================================================
export function buildSystemPrompt(
  persona: Persona,
  memory: MemoryContext,
  latestUserText = '',
  uiLanguage: ReplyLanguage = 'auto',
): string {
  const parts: string[] = []

  parts.push(`# Current Turn Anchor\n${turnAnchor(latestUserText)}`)
  parts.push(`# Response Language\n${languageGuide(latestUserText, uiLanguage)}`)
  parts.push(`# Persona\n${persona.prompt}`)

  if (memory.coreMemories.length > 0) {
    const list = [...memory.coreMemories]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5)
      .map(m => `- ${m.fact}`)
      .join('\n')
    parts.push(`# Core Facts About User\n${list}`)
  }

  const goodMatches = (memory.semanticMatches ?? [])
    .filter(s => (s.similarity ?? 0) > 0.82)
    .slice(0, 2)
  const hasRelevantMemory = goodMatches.length > 0
  if (goodMatches.length > 0) {
    const list = goodMatches
      .map(s => `- ${s.summary_text} (relevance ${Math.round((s.similarity ?? 0) * 100)}%)`)
      .join('\n')
    parts.push(`# Topic-Relevant Memory\n${list}`)
  }

  if (goodMatches.length > 0 && memory.midTermSummary.length > 0) {
    const list = memory.midTermSummary
      .slice(0, 1)
      .map(s => formatMid(s))
      .join('\n\n')
    parts.push(`# Recent Impressions\n${list}`)
  }

  if (goodMatches.length > 0 && memory.longTermFragments.length > 0) {
    const list = memory.longTermFragments
      .slice(0, 1)
      .flatMap(s => {
        const facts = Array.isArray(s.key_facts) ? s.key_facts : []
        return facts.length > 0
          ? facts.map((f: string) => `- Maybe... ${f} ?`)
          : [`- Maybe... ${s.summary_text?.slice(0, 40)} ?`]
      })
      .join('\n')
    parts.push(`# Distant Fragments\n${list}`)
  }

  parts.push(`# Memory Usage\n${memoryUsageGuide(hasRelevantMemory)}`)
  parts.push(`# Style Guide\n${styleGuide(persona.reply_style)}`)

  return parts.join('\n\n---\n\n')
}

function turnAnchor(latestUserText: string): string {
  const latest = (latestUserText || '').trim()
  if (!latest) {
    return [
      '- Start by addressing the latest user message directly.',
      '- Do not output generic greetings or repeated self-introduction.',
      '- If context is unclear, ask one short clarifying question.',
    ].join('\n')
  }

  return [
    '- First sentence must directly respond to the user\'s latest message.',
    '- Never ignore the latest message.',
    '- If older context is not relevant to the latest message, ignore it.',
    '- Do not restart the conversation or repeat fixed intro lines.',
    `- Latest user message: """${latest.slice(0, 600)}"""`,
  ].join('\n')
}

function languageGuide(userText: string, uiLanguage: ReplyLanguage): string {
  if (uiLanguage === 'en') {
    return [
      '- Highest priority: reply fully in natural English.',
      '- Do not switch to Chinese unless user changes UI language to Chinese or asks explicitly.',
      '- Keep names and fixed terms as-is.',
    ].join('\n')
  }

  if (uiLanguage === 'zh') {
    return [
      '- Highest priority: reply fully in Simplified Chinese.',
      '- Keep names and fixed terms as-is.',
    ].join('\n')
  }

  const text = (userText || '').trim()
  const lower = text.toLowerCase()

  const forceEnglish =
    /\b(english|in english|speak english|reply in english|use english)\b/.test(lower) ||
    /英文|英语|用英语|請用英文|请用英文/.test(text)

  if (forceEnglish) {
    return [
      '- Highest priority: reply fully in natural English.',
      '- Do not switch to Chinese unless the user explicitly asks for Chinese.',
      '- Keep names and fixed terms as-is.',
    ].join('\n')
  }

  const hasCjk = /[\u4e00-\u9fff]/.test(text)
  if (hasCjk) {
    return [
      '- Reply in Simplified Chinese by default.',
      '- If user later asks for English, switch immediately and stay in English.',
    ].join('\n')
  }

  return [
    '- Reply in English by default for this turn.',
    '- If user later asks for Chinese, switch immediately.',
  ].join('\n')
}

function formatMid(s: MemorySnapshot): string {
  return s.clarity_score > 0.6
    ? `I remember: ${s.summary_text}`
    : `I seem to remember: ${s.summary_text} (details are a bit fuzzy)`
}

function memoryUsageGuide(hasRelevantMemory: boolean): string {
  if (!hasRelevantMemory) {
    return [
      '- Treat memory as hidden context.',
      '- Do not explicitly mention memory, remembering, past chats, or "I remember" phrasing.',
      '- Focus on the latest user message directly.',
    ].join('\n')
  }

  return [
    '- Use memory only if it is directly helpful to the latest user message.',
    '- Keep memory references subtle and natural; at most once in a reply.',
    '- Never let memory references replace direct response to the latest user message.',
  ].join('\n')
}

function styleGuide(style: string): string {
  const base = `- Stay in character and keep a natural conversation tone
- Avoid bullet-point style in final user-facing replies
- Never repeat self-introduction unless user explicitly asks who you are
- Do not echo the user's sentence verbatim; move the conversation forward
- If user sends an image, describe it naturally and tie it to the conversation`
  const tips: Record<string, string> = {
    short: '- Keep it brief (1-3 sentences) and conversational.',
    medium: '- Keep medium length with useful detail and no rambling.',
    long: '- You may elaborate more, but keep dialogue flow natural.',
  }
  return base + '\n' + (tips[style] ?? tips.medium)
}

// ================================================
// Build Message History
// ================================================
export function buildMessageHistory(
  memory: MemoryContext,
  userText: string,
  imageBase64?: string,
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> }> {
  const history = selectRelevantShortHistory(memory.shortTermMessages, userText)
    .map((msg: DbMessage) => ({
      role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: msg.content || '(image)' }],
    }))

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: userText || 'Please describe this image.' })

  return [...history, { role: 'user' as const, parts }]
}

function selectRelevantShortHistory(messages: DbMessage[], latestUserText: string): DbMessage[] {
  const recent = messages
    .filter((m: DbMessage) => Boolean((m.content || '').trim()))
    .slice(-10)

  const latest = (latestUserText || '').trim()
  if (!latest) return recent.slice(-4)
  if (isLikelyFollowUp(latest)) return recent.slice(-4)

  const queryTokens = tokenizeForTopic(latest)
  if (queryTokens.size === 0) return []

  const scored = recent.map((msg, idx) => ({
    idx,
    msg,
    score: topicOverlap(queryTokens, msg.content || ''),
  }))

  let selected = scored.filter(x => x.score >= 0.26)
  if (selected.length === 0) {
    const best = [...scored].sort((a, b) => b.score - a.score)[0]
    if (best && best.score >= 0.14) selected = [best]
  }

  return selected
    .sort((a, b) => a.idx - b.idx)
    .slice(-4)
    .map(x => x.msg)
}

function isLikelyFollowUp(text: string): boolean {
  const t = (text || '').trim().toLowerCase()
  if (!t) return false

  // Very short replies are usually dependent on previous turn.
  if (t.length <= 8) return true

  // Common Chinese follow-up cues.
  if (/(那你|你呢|然后呢|还有呢|是吗|有吗|咋样|怎么样|为啥|为什么|什么意思|哪个|这个|那个)/.test(t)) return true

  // Common English follow-up cues.
  if (/^(what about|and you|why|how so|which one|this|that)/.test(t)) return true

  return false
}

function topicOverlap(queryTokens: Set<string>, text: string): number {
  const target = tokenizeForTopic(text)
  if (target.size === 0) return 0
  let overlap = 0
  for (const t of queryTokens) {
    if (target.has(t)) overlap += 1
  }
  return overlap / queryTokens.size
}

function tokenizeForTopic(text: string): Set<string> {
  const set = new Set<string>()
  const lower = (text || '').toLowerCase()

  const latin = lower.match(/[a-z0-9]{2,}/g) ?? []
  for (const w of latin) set.add(w)

  const cjkChars = lower.match(/[\u4e00-\u9fff]/g) ?? []
  for (let i = 0; i < cjkChars.length - 1; i += 1) {
    set.add(cjkChars[i] + cjkChars[i + 1])
  }

  return set
}
