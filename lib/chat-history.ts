import type { ChatSessionDetail, ChatSessionSummary, DbMessage } from '../types/index'
import { dbAll, dbFirst, dbRun, type D1Env } from './knowledgeos-d1'

type SessionRow = {
  id: string
  title: string
  persona_id: string | null
  session_type: 'text' | 'voice'
  last_message_preview: string | null
  last_message_at: string | null
  message_count: number | null
  is_pinned: number | null
  created_at: string
  updated_at: string
  persona_name: string | null
  persona_name_en: string | null
  persona_avatar: string | null
}

const SESSION_SELECT = `SELECT s.id, s.title, s.persona_id, s.session_type, s.last_message_preview,
  s.last_message_at, s.message_count, s.is_pinned, s.created_at, s.updated_at,
  p.name AS persona_name, p.name_en AS persona_name_en, p.avatar AS persona_avatar
  FROM chat_sessions s LEFT JOIN personas p ON p.id = s.persona_id`

function previewText(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim()
  return compact.length > 80 ? `${compact.slice(0, 80)}...` : compact
}

function defaultTitle(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim()
  if (!compact) return '新对话'
  return compact.length > 24 ? `${compact.slice(0, 24)}...` : compact
}

function mapSession(row: SessionRow): ChatSessionSummary {
  return {
    id: row.id,
    title: row.title || '新对话',
    persona_id: row.persona_id ?? null,
    persona_name: row.persona_name ?? null,
    persona_name_en: row.persona_name_en ?? null,
    persona_avatar: row.persona_avatar ?? null,
    session_type: row.session_type || 'text',
    last_message_preview: row.last_message_preview ?? '',
    last_message_at: row.last_message_at ?? row.created_at,
    message_count: Number(row.message_count ?? 0),
    is_pinned: Boolean(row.is_pinned),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function getChatSessionSummary(env: D1Env, sessionId: string): Promise<ChatSessionSummary | null> {
  const row = await dbFirst<SessionRow>(env, `${SESSION_SELECT} WHERE s.id = ? LIMIT 1`, [sessionId])
  return row ? mapSession(row) : null
}

export async function createChatSession(
  env: D1Env,
  input: {
    title?: string
    persona_id?: string
    session_type?: 'text' | 'voice'
  },
): Promise<ChatSessionSummary> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const ok = await dbRun(
    env,
    `INSERT INTO chat_sessions (id, title, persona_id, session_type, last_message_preview, last_message_at, message_count, is_pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', ?, 0, 0, ?, ?)`,
    [id, input.title?.trim() || '新对话', input.persona_id ?? null, input.session_type ?? 'text', now, now, now],
  )
  if (!ok) throw new Error('create chat session failed')
  const session = await getChatSessionSummary(env, id)
  if (!session) throw new Error('create chat session returned empty response')
  return session
}

export async function listChatSessions(env: D1Env): Promise<ChatSessionSummary[]> {
  const rows = await dbAll<SessionRow>(
    env,
    `${SESSION_SELECT} ORDER BY s.is_pinned DESC, s.last_message_at DESC, s.created_at DESC LIMIT 100`,
  )
  return (rows ?? []).map(mapSession)
}

export async function getChatSession(env: D1Env, sessionId: string): Promise<ChatSessionDetail | null> {
  const row = await dbFirst<SessionRow>(env, `${SESSION_SELECT} WHERE s.id = ? LIMIT 1`, [sessionId])
  if (!row) return null

  const messages =
    (await dbAll<DbMessage>(
      env,
      `SELECT id, role, content, content_type, image_url, session_id, created_at
       FROM messages WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId],
    )) ?? []
  return {
    ...mapSession(row),
    messages,
  }
}

export async function patchChatSession(
  env: D1Env,
  sessionId: string,
  patch: Partial<Pick<ChatSessionSummary, 'title' | 'is_pinned'>>,
): Promise<ChatSessionSummary | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (typeof patch.title === 'string') {
    sets.push('title = ?')
    params.push(patch.title.trim() || '新对话')
  }
  if (typeof patch.is_pinned === 'boolean') {
    sets.push('is_pinned = ?')
    params.push(patch.is_pinned ? 1 : 0)
  }
  sets.push('updated_at = ?')
  params.push(new Date().toISOString())
  params.push(sessionId)

  const ok = await dbRun(env, `UPDATE chat_sessions SET ${sets.join(', ')} WHERE id = ?`, params)
  if (!ok) throw new Error('patch chat session failed')
  return getChatSessionSummary(env, sessionId)
}

export async function deleteChatSession(env: D1Env, sessionId: string): Promise<void> {
  await dbRun(env, `DELETE FROM messages WHERE session_id = ?`, [sessionId])
  const ok = await dbRun(env, `DELETE FROM chat_sessions WHERE id = ?`, [sessionId])
  if (!ok) throw new Error('delete chat session failed')
}

export async function syncChatSessionFromMessages(
  env: D1Env,
  sessionId: string,
  opts: {
    persona_id?: string
    session_type?: 'text' | 'voice'
    fallbackTitle?: string
  } = {},
): Promise<void> {
  const messages =
    (await dbAll<Pick<DbMessage, 'id' | 'role' | 'content' | 'created_at'>>(
      env,
      `SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId],
    )) ?? []

  const firstUser = messages.find(m => m.role === 'user')
  const lastMessage = messages[messages.length - 1]

  const ok = await dbRun(
    env,
    `UPDATE chat_sessions SET title = ?, persona_id = ?, session_type = ?, last_message_preview = ?,
       last_message_at = ?, message_count = ?, updated_at = ? WHERE id = ?`,
    [
      defaultTitle(firstUser?.content || opts.fallbackTitle || ''),
      opts.persona_id ?? null,
      opts.session_type ?? 'text',
      lastMessage ? previewText(lastMessage.content) : '',
      lastMessage?.created_at || new Date().toISOString(),
      messages.length,
      new Date().toISOString(),
      sessionId,
    ],
  )
  if (!ok) throw new Error('sync chat session failed')
}
