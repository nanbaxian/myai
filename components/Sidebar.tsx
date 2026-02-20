'use client'

// components/Sidebar.tsx — P2 版本：记忆管理 + 多人设切换入口

import { useEffect, useState } from 'react'
import { Persona } from '@/types'
import AuthWidget from '@/components/AuthWidget'

interface MemoryItem { id: string; tier: string; content: string }

interface Props {
  persona: Persona | null
  onEditPersona:    () => void
  onOpenMemory:     () => void   // P2：记忆管理
  onSwitchPersona:  () => void   // P2：人设切换
  refreshKey?:      number       // 每次 AI 回复后+1，触发记忆刷新
}

const TIER_CFG = {
  core:  { label: '核心', cls: 'border-amber-400 bg-amber-50/60 text-ink',        badge: 'bg-amber-100 text-amber-700' },
  short: { label: '短期', cls: 'border-accent bg-red-50/60 text-ink',             badge: 'bg-red-100 text-accent' },
  mid:   { label: '中期', cls: 'border-yellow-400 bg-yellow-50/60 text-ink-soft', badge: 'bg-yellow-100 text-yellow-700' },
  long:  { label: '长期', cls: 'border-stone-300 bg-stone-50/60 text-ink-mute',   badge: 'bg-stone-100 text-stone-500' },
} as const

export default function Sidebar({ persona, onEditPersona, onOpenMemory, onSwitchPersona, refreshKey = 0 }: Props) {
  const [memories, setMemories] = useState<MemoryItem[]>([])

  useEffect(() => {
    fetch('/api/memory/list')
      .then(r => r.json() as Promise<MemoryItem[]>)
      .then(data => setMemories(data || []))
      .catch(() => {})
  }, [refreshKey])

  return (
    <aside className="w-[272px] min-w-[272px] flex flex-col border-r border-paper-deep bg-paper-warm overflow-hidden">

      {/* App Header */}
      <div className="px-6 pt-7 pb-5 border-b border-paper-deep flex-shrink-0">
        <div className="font-display text-[22px] text-ink tracking-wide">
          心<span className="text-accent italic">语</span>
        </div>
        <div className="text-[11px] text-ink-mute mt-1 uppercase tracking-widest">AI 伴侣 · 私人版</div>
      </div>

      {/* Persona Card */}
      <div className="mx-4 mt-5 mb-1 relative">
        {/* 编辑按钮 */}
        <div
          onClick={onEditPersona}
          className="p-4 bg-paper rounded-xl border border-paper-deep cursor-pointer transition-all hover:shadow-card hover:-translate-y-px relative overflow-hidden group"
        >
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-r" />
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-soft to-accent flex items-center justify-center text-[22px] mb-2.5 shadow-glow">
            {persona?.avatar || '🌸'}
          </div>
          <div className="font-serif text-[16px] text-ink">{persona?.name || '加载中...'}</div>
          <div className="text-xs text-ink-mute mt-1 leading-relaxed line-clamp-2">
            {persona?.prompt?.slice(0, 55) || '点击编辑人设'}...
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-ink-mute">在线</span>
          </div>
          <div className="absolute top-3 right-3 text-[10px] text-ink-mute opacity-0 group-hover:opacity-100 transition-opacity">编辑 →</div>
        </div>

        {/* 切换人设按钮（右上角浮动） */}
        <button
          onClick={onSwitchPersona}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-paper border border-paper-deep shadow-sm text-xs text-ink-mute hover:text-accent hover:border-accent-soft transition-all flex items-center justify-center"
          title="切换人设"
        >⇄</button>
      </div>

      {/* Memory Section */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="text-[10px] uppercase tracking-widest text-ink-mute py-3 flex items-center gap-2">
          记忆
          <div className="flex-1 h-px bg-paper-deep" />
        </div>

        {memories.length === 0 ? (
          <div className="text-xs text-ink-mute text-center py-6 leading-relaxed">
            还没有记忆<br/>
            <span className="text-[11px]">多聊几句就会有了</span>
          </div>
        ) : (
          memories.map(mem => {
            const cfg = TIER_CFG[mem.tier as keyof typeof TIER_CFG] ?? TIER_CFG.short
            return (
              <div key={mem.id} className={`px-3 py-2 rounded-lg border-l-2 mb-1.5 text-xs leading-relaxed ${cfg.cls}`}>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full mr-1 font-medium uppercase tracking-wide ${cfg.badge}`}>
                  {cfg.label}
                </span>
                {mem.content}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-paper-deep flex-shrink-0">
        <AuthWidget className="mb-3" />
        <div className="flex gap-2">
          <button onClick={onEditPersona}   className="flex-1 py-2 rounded-lg border border-paper-deep text-[11px] text-ink-mute hover:bg-paper hover:text-ink transition-all">✦ 人设</button>
          <button onClick={onOpenMemory}    className="flex-1 py-2 rounded-lg border border-paper-deep text-[11px] text-ink-mute hover:bg-paper hover:text-ink transition-all">◎ 记忆</button>
          <button onClick={onSwitchPersona} className="flex-1 py-2 rounded-lg border border-paper-deep text-[11px] text-ink-mute hover:bg-paper hover:text-ink transition-all">⇄ 切换</button>
        </div>
      </div>
    </aside>
  )
}
