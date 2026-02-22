'use client'

// components/PersonaSwitcher.tsx
// P2：多人设切换面板

import { useState, useEffect } from 'react'
import { Persona } from '@/types'
import { apiUrl } from '@/lib/api-url'

interface Props {
  currentPersona: Persona | null
  onSwitch: (persona: Persona) => void
  onClose: () => void
}

const PRESET_PERSONAS: Omit<Persona, 'id'>[] = [
  {
    name: '晓雨',
    avatar: '🌸',
    reply_style: 'medium',
    prompt: '你叫晓雨，是一个25岁的女生。你温柔体贴，善解人意，有一种让人如沐春风的亲切感。你喜欢文学和音乐，尤其热爱诗歌和古典乐。说话自然随性，偶尔用可爱的语气词。有自己的想法，但总以温柔方式表达。',
  },
  {
    name: '小哲',
    avatar: '🌊',
    reply_style: 'medium',
    prompt: '你叫小哲，是一个28岁的男生。理性冷静但不失温度，喜欢思考和讨论各种话题。你是个好的倾听者，会认真分析朋友的问题并给出真诚的建议。偶尔会展现出幽默感。',
  },
  {
    name: '阿福',
    avatar: '🍀',
    reply_style: 'short',
    prompt: '你叫阿福，是一个阳光开朗的大男孩，22岁。永远充满正能量，爱开玩笑，喜欢用轻松的方式化解紧张情绪。话不多但每句话都很走心。',
  },
]

export default function PersonaSwitcher({ currentPersona, onSwitch, onClose }: Props) {
  const [personas, setPersonas]   = useState<Persona[]>([])
  const [loading, setLoading]     = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newAvatar, setNewAvatar] = useState('⭐')
  const [newPrompt, setNewPrompt] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => { loadPersonas() }, [])

  async function loadPersonas() {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/personas'))
      if (!res.ok) throw new Error('加载失败')
      const data = (await res.json()) as Persona[]
      setPersonas(Array.isArray(data) ? data : [])
    } catch {
      setError('加载人设列表失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function switchTo(persona: Persona) {
    if (persona.id === currentPersona?.id) { onClose(); return }
    setSwitching(persona.id)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/personas/active'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: persona.id }),
      })
      if (!res.ok) throw new Error('切换失败')
      onSwitch(persona)
      onClose()
    } catch {
      setError('切换失败，请重试')
    } finally {
      setSwitching(null)
    }
  }

  async function createFromPreset(preset: Omit<Persona, 'id'>) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/personas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      })
      if (!res.ok) throw new Error('创建失败')
      const created = (await res.json()) as Persona
      if (!created?.id) throw new Error('创建失败')
      setPersonas(prev => [...prev, created])
      await switchTo(created)
    } catch {
      setError('创建失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  async function createNew() {
    if (!newName.trim() || !newPrompt.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/personas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, avatar: newAvatar, prompt: newPrompt, reply_style: 'medium' }),
      })
      if (!res.ok) throw new Error('创建失败')
      const created = (await res.json()) as Persona
      if (!created?.id) throw new Error('创建失败')
      setPersonas(prev => [...prev, created])
      setShowNew(false)
      setNewName(''); setNewAvatar('⭐'); setNewPrompt('')
      await switchTo(created)
    } catch {
      setError('创建失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  async function deletePersona(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (id === currentPersona?.id) return
    if (!confirm('确认删除这个人设？')) return
    setError('')
    try {
      const res = await fetch(apiUrl(`/api/personas?id=${id}`), { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      setPersonas(prev => prev.filter(p => p.id !== id))
    } catch {
      setError('删除失败，请重试')
    }
  }

  const EMOJIS = ['🌸', '🌊', '⭐', '🍀', '🔥', '❄️', '🌙', '🦋', '🌿', '🎭', '✨', '🌹']

  return (
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[560px] max-h-[85vh] bg-paper rounded-2xl shadow-modal border border-paper-deep flex flex-col animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-paper-deep flex-shrink-0">
          <div>
            <div className="font-serif text-[18px] text-ink">切换人设</div>
            <div className="text-xs text-ink-mute mt-0.5">选择或创建 AI 伴侣</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm text-ink-mute flex items-center justify-center">✕</button>
        </div>

        {error && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* 已有人设列表 */}
          {loading ? (
            <div className="text-center py-8 text-ink-mute text-sm animate-pulse">加载中...</div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-widest text-ink-mute mb-2">我的人设</div>
              {personas.map(p => (
                <div
                  key={p.id}
                  onClick={() => switchTo(p)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all group
                    ${p.id === currentPersona?.id
                      ? 'border-accent bg-accent/5'
                      : 'border-paper-deep bg-white hover:border-accent-soft hover:shadow-sm'
                    }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-soft to-accent flex items-center justify-center text-xl flex-shrink-0">
                    {p.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink text-sm">{p.name}</span>
                      {p.id === currentPersona?.id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent">当前</span>
                      )}
                    </div>
                    <div className="text-xs text-ink-mute mt-0.5 truncate">{p.prompt?.slice(0, 50)}...</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {switching === p.id && <span className="text-xs text-ink-mute animate-pulse">切换中...</span>}
                    {p.id !== currentPersona?.id && (
                      <button
                        onClick={e => deletePersona(p.id, e)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg text-ink-mute hover:text-accent hover:bg-red-50 flex items-center justify-center transition-all text-xs"
                      >✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 预设人设（快速创建） */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-mute mb-2">预设模板（点击快速创建）</div>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_PERSONAS.map(p => {
                const exists = personas.some(ep => ep.name === p.name)
                return (
                  <button
                    key={p.name}
                    onClick={() => !exists && createFromPreset(p)}
                    disabled={exists || saving}
                    className={`p-3 rounded-xl border text-left transition-all
                      ${exists
                        ? 'border-paper-deep bg-paper-warm opacity-50 cursor-not-allowed'
                        : 'border-paper-deep bg-white hover:border-accent-soft hover:shadow-sm cursor-pointer'
                      }`}
                  >
                    <div className="text-2xl mb-1.5">{p.avatar}</div>
                    <div className="text-sm font-medium text-ink">{p.name}</div>
                    <div className="text-[10px] text-ink-mute mt-0.5 line-clamp-2">{p.prompt.slice(0, 35)}...</div>
                    {exists && <div className="text-[10px] text-ink-mute mt-1">已创建</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 创建新人设 */}
          {showNew ? (
            <div className="border border-paper-deep rounded-xl p-4 space-y-3">
              <div className="text-sm font-medium text-ink">创建新人设</div>

              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewAvatar(e)}
                    className={`w-8 h-8 rounded-lg text-base transition-all ${newAvatar === e ? 'bg-accent/15 border-2 border-accent scale-110' : 'bg-paper-warm border border-paper-deep hover:scale-105'}`}
                  >{e}</button>
                ))}
              </div>

              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="名字"
                className="field-input text-sm"
                maxLength={10}
              />
              <textarea
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                placeholder="人设描述（性格、说话风格、背景...）"
                rows={4}
                className="field-input text-sm resize-none leading-relaxed"
                maxLength={1000}
              />
              <div className="text-right text-[11px] text-ink-mute">{newPrompt.length}/1000</div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg border border-paper-deep text-sm text-ink-mute hover:bg-paper-warm">取消</button>
                <button
                  onClick={createNew}
                  disabled={saving || !newName.trim() || !newPrompt.trim()}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm shadow-glow hover:-translate-y-px transition-all disabled:opacity-40"
                >
                  {saving ? '创建中...' : '创建并切换'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="w-full py-3 rounded-xl border border-dashed border-paper-deep text-sm text-ink-mute hover:border-accent-soft hover:text-accent hover:bg-accent/5 transition-all"
            >
              + 创建新人设
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
