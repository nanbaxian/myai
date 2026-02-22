'use client'

import { useEffect, useState } from 'react'
import { Persona } from '@/types'
import { supabase } from '@/lib/supabase-browser'
import { AnimatePresence, motion } from 'framer-motion'
import type { ComponentType } from 'react'
import {
  Sparkles,
  Settings,
  Brain,
  Users,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  History,
} from 'lucide-react'

interface Props {
  persona: Persona | null
  isOpen: boolean
  onToggle: () => void
  onEditPersona: () => void
  onOpenMemory: () => void
  onSwitchPersona: () => void
  onOpenHistory: () => void
  onStartVoiceCall: () => void
  refreshKey?: number
}

export default function Sidebar({
  persona,
  isOpen,
  onToggle,
  onEditPersona,
  onOpenMemory,
  onSwitchPersona,
  onOpenHistory,
  onStartVoiceCall,
}: Props) {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUserEmail(data.session?.user?.email ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setUserEmail(sess?.user?.email ?? null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const onLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onToggle}
          className="fixed top-4 left-4 z-40 glass-panel rounded-xl p-2.5 hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed lg:relative z-30 w-[280px] h-full flex flex-col bg-sidebar border-r border-sidebar-border"
          >
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span className="font-serif text-lg text-foreground">心语</span>
              </div>
              <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {persona && (
              <div className="mx-4 mb-4 p-4 rounded-xl bg-sidebar-accent border border-sidebar-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-xl border border-primary/20">
                    {persona.avatar || '🌸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-sm text-foreground truncate">{persona.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                      <span className="text-xs text-muted-foreground">在线</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {persona.prompt?.slice(0, 80)}...
                </p>
              </div>
            )}

            <div className="px-3 space-y-1 flex-1">
              <SidebarButton icon={Settings} label="编辑人设" onClick={onEditPersona} />
              <SidebarButton icon={Brain} label="记忆管理" onClick={onOpenMemory} />
              <SidebarButton icon={Users} label="切换人设" onClick={onSwitchPersona} />
              <SidebarButton icon={History} label="聊天记录" onClick={onOpenHistory} />
              <SidebarButton icon={Phone} label="语音通话" onClick={onStartVoiceCall} />
              <SidebarButton icon={Plus} label="新对话" onClick={() => window.location.reload()} />
            </div>

            <div className="p-4 border-t border-sidebar-border">
              {userEmail ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                    {userEmail[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
                    title="退出"
                  >
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">未登录</div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-20 lg:hidden"
          />
        )}
      </AnimatePresence>
    </>
  )
}

function SidebarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all group"
    >
      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      {label}
    </button>
  )
}
