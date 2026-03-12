'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, MessageSquare, Phone, Trash2, Pin, MoreHorizontal } from 'lucide-react'
import type { ChatSessionSummary } from '@/types'
import { apiUrl } from '@/lib/api-url'

interface Props {
  isOpen: boolean
  currentSessionId?: string | null
  refreshKey?: number
  onClose: () => void
  onSelectSession: (sessionId: string) => void
  onDeletedSession?: (sessionId: string) => void
}

export default function ChatHistoryPanel({
  isOpen,
  currentSessionId,
  refreshKey = 0,
  onClose,
  onSelectSession,
  onDeletedSession,
}: Props) {
  const [search, setSearch] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(apiUrl('/api/history'))
        if (!res.ok) throw new Error('load history failed')
        const data = (await res.json()) as ChatSessionSummary[]
        if (!cancelled) setSessions(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setSessions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, refreshKey])

  const filtered = useMemo(() => {
    const keyword = search.trim()
    if (!keyword) return sessions
    return sessions.filter(
      s =>
        s.title.includes(keyword) ||
        s.last_message_preview.includes(keyword) ||
        (s.persona_name || '').includes(keyword),
    )
  }, [search, sessions])

  const pinned = filtered.filter(s => s.is_pinned)
  const recent = filtered.filter(s => !s.is_pinned)

  async function togglePin(session: ChatSessionSummary) {
    try {
      const res = await fetch(apiUrl(`/api/history/${session.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !session.is_pinned }),
      })
      if (!res.ok) throw new Error('toggle pin failed')
      const updated = (await res.json()) as ChatSessionSummary
      setSessions(prev => prev.map(item => (item.id === session.id ? updated : item)))
      setActiveMenu(null)
    } catch {
      // keep UI stable on failure
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      const res = await fetch(apiUrl(`/api/history/${sessionId}`), { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      setSessions(prev => prev.filter(item => item.id !== sessionId))
      setActiveMenu(null)
      onDeletedSession?.(sessionId)
    } catch {
      // keep UI stable on failure
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed lg:relative z-30 w-[320px] h-full flex flex-col bg-sidebar border-r border-sidebar-border"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
            <h2 className="font-serif text-base text-foreground">聊天记录</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索聊天记录..."
                className="w-full bg-input border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div className="mb-3">
                    <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Pin className="w-3 h-3" />
                      置顶
                    </div>
                    {pinned.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === currentSessionId}
                        isMenuOpen={activeMenu === session.id}
                        onToggleMenu={() => setActiveMenu(activeMenu === session.id ? null : session.id)}
                        onSelect={() => onSelectSession(session.id)}
                        onTogglePin={() => togglePin(session)}
                        onDelete={() => deleteSession(session.id)}
                      />
                    ))}
                  </div>
                )}

                {recent.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">最近</div>
                    {recent.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === currentSessionId}
                        isMenuOpen={activeMenu === session.id}
                        onToggleMenu={() => setActiveMenu(activeMenu === session.id ? null : session.id)}
                        onSelect={() => onSelectSession(session.id)}
                        onTogglePin={() => togglePin(session)}
                        onDelete={() => deleteSession(session.id)}
                      />
                    ))}
                  </div>
                )}

                {filtered.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">没有找到聊天记录</div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SessionItem({
  session,
  isActive,
  isMenuOpen,
  onToggleMenu,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  session: ChatSessionSummary
  isActive: boolean
  isMenuOpen: boolean
  onToggleMenu: () => void
  onSelect: () => void
  onTogglePin: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-start gap-3 ${
          isActive ? 'bg-sidebar-accent border border-primary/20' : 'hover:bg-sidebar-accent'
        }`}
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
          {session.persona_avatar || (session.session_type === 'voice' ? '📞' : '💬')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm text-foreground font-medium truncate flex-1">{session.title}</span>
            {session.session_type === 'voice' && <Phone className="w-3 h-3 text-primary flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{session.last_message_preview || '暂无消息'}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground">{formatTime(session.last_message_at)}</span>
            {session.message_count > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" />
                {session.message_count}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        onClick={e => {
          e.stopPropagation()
          onToggleMenu()
        }}
        className="absolute top-3 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-10 right-2 z-20 glass-panel rounded-xl py-1 min-w-[120px] shadow-xl"
          >
            <button
              onClick={onTogglePin}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
            >
              <Pin className="w-3 h-3" />
              {session.is_pinned ? '取消置顶' : '置顶'}
            </button>
            <button
              onClick={onDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              删除
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatTime(input: string): string {
  const date = new Date(input)
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}
