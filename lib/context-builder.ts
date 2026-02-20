// lib/context-builder.ts
// 从 @/types 导入，消除重复 Persona / MemoryContext 定义

import type { Persona, MemoryContext, MemorySnapshot, DbMessage } from '../types/index'

export type { Persona }

// ================================================
// 构建 System Prompt
// ================================================
export function buildSystemPrompt(persona: Persona, memory: MemoryContext): string {
  const parts: string[] = []

  parts.push(`# 你的身份与人设\n${persona.prompt}`)

  if (memory.coreMemories.length > 0) {
    const list = [...memory.coreMemories]
      .sort((a, b) => b.importance - a.importance)
      .map(m => `- ${m.fact}`)
      .join('\n')
    parts.push(`# 关于对方，你清楚记得\n${list}`)
  }

  // P2：语义相关记忆优先注入
  const goodMatches = (memory.semanticMatches ?? []).filter(s => (s.similarity ?? 0) > 0.7)
  if (goodMatches.length > 0) {
    const list = goodMatches
      .map(s => `- ${s.summary_text}（相关度 ${Math.round((s.similarity ?? 0) * 100)}%）`)
      .join('\n')
    parts.push(`# 和这个话题相关的记忆\n${list}`)
  }

  if (memory.midTermSummary.length > 0) {
    const list = memory.midTermSummary
      .map(s => formatMid(s))
      .join('\n\n')
    parts.push(`# 最近一段时间的印象\n${list}`)
  }

  if (memory.longTermFragments.length > 0) {
    const list = memory.longTermFragments
      .flatMap(s => {
        const facts = Array.isArray(s.key_facts) ? s.key_facts : []
        return facts.length > 0
          ? facts.map((f: string) => `- 好像...${f}？记不太清了`)
          : [`- 好像...${s.summary_text?.slice(0, 40)}？`]
      })
      .join('\n')
    parts.push(`# 久远的模糊片段\n${list}`)
  }

  parts.push(`# 行为规范\n${styleGuide(persona.reply_style)}`)

  return parts.join('\n\n---\n\n')
}

function formatMid(s: MemorySnapshot): string {
  return s.clarity_score > 0.6
    ? `我记得，${s.summary_text}`
    : `我好像记得，${s.summary_text}（细节有些模糊了）`
}

function styleGuide(style: string): string {
  const base = `- 保持人设一致，用符合你性格的语气说话
- 对中期记忆用"我记得..."、"好像..."等不确定措辞
- 对长期记忆用"好像...？"等更模糊的表述
- 不要用 bullet points，像真实聊天一样说话
- 如果收到图片，自然描述并结合对话语境回应`
  const tips: Record<string, string> = {
    short:  '- 回复简短，1-3句话，保持聊天节奏',
    medium: '- 回复适中，根据话题深度调整，不要啰嗦',
    long:   '- 可以详细展开，分享更多想法，但保持对话感',
  }
  return base + '\n' + (tips[style] ?? tips['medium'])
}

// ================================================
// 构建 Gemini messages 历史
// ================================================
export function buildMessageHistory(
  memory: MemoryContext,
  userText: string,
  imageBase64?: string,
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> }> {
  const history = memory.shortTermMessages.map((msg: DbMessage) => ({
    role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    parts: [{ text: msg.content || '（图片）' }],
  }))

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: userText || '你看这张图片' })

  return [...history, { role: 'user' as const, parts }]
}
