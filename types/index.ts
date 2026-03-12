export interface Persona {
  id: string
  name: string
  avatar: string
  prompt: string
  reply_style: 'short' | 'medium' | 'long'
  voice_id?: string
}

export type ReplyLanguage = 'zh' | 'en'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  content_type: 'text' | 'image' | 'voice'
  session_id?: string
  image_preview?: string
  image_url?: string
  is_typing?: boolean
  created_at: string
}

export interface DbMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  content_type: 'text' | 'image' | 'voice'
  session_id?: string
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
  similarity?: number
}

export interface MemoryContext {
  coreMemories: CoreMemory[]
  midTermSummary: MemorySnapshot[]
  longTermFragments: MemorySnapshot[]
  shortTermMessages: DbMessage[]
  semanticMatches?: MemorySnapshot[]
}

export interface ChatSessionSummary {
  id: string
  title: string
  persona_id?: string | null
  persona_name?: string | null
  persona_avatar?: string | null
  session_type: 'text' | 'voice'
  last_message_preview: string
  last_message_at: string
  message_count: number
  is_pinned: boolean
  created_at: string
  updated_at?: string
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: Message[]
}
