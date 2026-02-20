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

function styleGuide(style: string): string {
  const base = `- Stay in character and keep a natural conversation tone
- For medium-term memory, use uncertain phrasing like "I remember" or "I think"
- For long-term memory, use even fuzzier phrasing like "maybe"
- Avoid bullet-point style in final user-facing replies
- Never repeat self-introduction unless user explicitly asks who you are
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
  const history = memory.shortTermMessages
    .filter((msg: DbMessage) => Boolean((msg.content || '').trim()))
    .slice(-8)
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
