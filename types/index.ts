// types/index.ts
// 全局唯一类型定义 —— 所有组件和 lib 统一从这里导入

// ================================================
// 人设
// ================================================
export interface Persona {
  id: string
  name: string
  avatar: string              // emoji
  prompt: string              // 人设描述，最多1000字
  reply_style: 'short' | 'medium' | 'long'
  voice_id?: string
}

// ================================================
// 消息（前端显示用，含 UI 专有字段）
// ================================================
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  content_type: 'text' | 'image' | 'voice'
  image_preview?: string      // 本地预览 blob:// / data://（仅前端）
  image_url?: string          // 服务端存储 URL
  is_typing?: boolean         // 流式占位消息标记
  created_at: string
}

// ================================================
// 记忆（lib 层，供 memory-engine / context-builder 共用）
// ================================================
export interface DbMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  content_type: 'text' | 'image' | 'voice'
  image_url?: string
  memory_tier?: 'short' | 'mid' | 'long'
  persona_id?: string
  created_at: string
}

export interface CoreMemory {
  id: string
  fact: string
  category: string
  importance: number
  created_at?: string
}

export interface MemorySnapshot {
  id: string
  tier: 'mid' | 'long'
  summary_text: string
  key_facts: string[]
  emotional_tone: string
  clarity_score: number
  period_start: string
  period_end: string
  similarity?: number         // P2 向量搜索返回
}

export interface MemoryContext {
  coreMemories: CoreMemory[]
  midTermSummary: MemorySnapshot[]
  longTermFragments: MemorySnapshot[]
  shortTermMessages: DbMessage[]
  semanticMatches?: MemorySnapshot[]
}
