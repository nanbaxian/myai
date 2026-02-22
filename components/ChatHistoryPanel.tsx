'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, MessageSquare, Phone, Trash2, Pin, MoreHorizontal } from 'lucide-react'

export interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  personaName: string
  personaAvatar: string
  messageCount: number
  isPinned?: boolean
  type: 'text' | 'voice'
}

const MOCK_SESSIONS: ChatSession[] = [
  {
    id: '1',
    title: '关于旅行的聊天',
    lastMessage: '下次我们聊聊巴黎吧！✨',
    timestamp: '刚刚',
    personaName: '晓雨',
    personaAvatar: '🌸',
    messageCount: 24,
    isPinned: true,
    type: 'text',
  },
  {
    id: '2',
    title: '睡前故事',
    lastMessage: '从前有一座被星光笼罩的山...',
    timestamp: '昨天',
    personaName: '晓雨',
    personaAvatar: '🌸',
    messageCount: 15,
    type: 'text',
  },
  {
    id: '3',
    title: '语音通话',
    lastMessage: '通话时长 12:34',
    timestamp: '2天前',
    personaName: '小夜',
    personaAvatar: '🌙',
    messageCount: 0,
    type: 'voice',
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectSession?: (session: ChatSession) => void
}

export default function ChatHistoryPanel({ isOpen, onClose, onSelectSession }: Props) {
  const [search, setSearch] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const filtered = MOCK_SESSIONS.filter(
    s => s.title.includes(search) || s.lastMessage.includes(search) || s.personaName.includes(search),
  )
  const pinned = filtered.filter(s => s.isPinned)
  const recent = filtered.filter(s => !s.isPinned)

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
                    isMenuOpen={activeMenu === session.id}
                    onToggleMenu={() => setActiveMenu(activeMenu === session.id ? null : session.id)}
                    onSelect={() => onSelectSession?.(session)}
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
                    isMenuOpen={activeMenu === session.id}
                    onToggleMenu={() => setActiveMenu(activeMenu === session.id ? null : session.id)}
                    onSelect={() => onSelectSession?.(session)}
                  />
                ))}
              </div>
            )}

            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">没有找到聊天记录</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SessionItem({
  session,
  isMenuOpen,
  onToggleMenu,
  onSelect,
}: {
  session: ChatSession
  isMenuOpen: boolean
  onToggleMenu: () => void
  onSelect: () => void
}) {
  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className="w-full text-left px-3 py-3 rounded-xl hover:bg-sidebar-accent transition-all flex items-start gap-3"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
          {session.personaAvatar}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm text-foreground font-medium truncate flex-1">{session.title}</span>
            {session.type === 'voice' && <Phone className="w-3 h-3 text-primary flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{session.lastMessage}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground">{session.timestamp}</span>
            {session.messageCount > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" />
                {session.messageCount}
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
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors">
              <Pin className="w-3 h-3" />
              {session.isPinned ? '取消置顶' : '置顶'}
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3 h-3" />
              删除
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
