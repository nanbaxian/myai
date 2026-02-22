'use client'

import { useState, useEffect, useRef } from 'react'
import { Persona } from '@/types'
import { apiUrl } from '@/lib/api-url'

interface Props {
  persona: Persona | null
  onSave: (persona: Persona) => void
  onClose: () => void
}

const EMOJI_OPTIONS = ['🌸', '🌙', '⭐', '🌊', '🦋', '🌿', '🔥', '❄️', '🌹', '🍀', '✨', '🎭']

export default function PersonaModal({ persona, onSave, onClose }: Props) {
  const [name, setName] = useState(persona?.name || '')
  const [avatar, setAvatar] = useState(persona?.avatar || '🌸')
  const [prompt, setPrompt] = useState(persona?.prompt || '')
  const [replyStyle, setReplyStyle] = useState<'short' | 'medium' | 'long'>(persona?.reply_style || 'medium')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const overlayRef = useRef<HTMLDivElement>(null)
  const charCount = prompt.length
  const isOver = charCount > 1000

  // 点击背景关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async () => {
    if (!name.trim()) { setError('请填写名字'); return }
    if (isOver) { setError('人设描述不能超过1000字'); return }
    setError('')
    setSaving(true)

    try {
      const res = await fetch(apiUrl('/api/persona'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, prompt, reply_style: replyStyle }),
      })

      if (!res.ok) throw new Error('保存失败')
      const updated = (await res.json()) as Persona
      if (!updated || !updated.id) throw new Error('保存失败')
      onSave(updated)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
    >
      <div className="w-[560px] max-h-[85vh] bg-paper rounded-2xl shadow-2xl border border-paper-deep flex flex-col animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-paper-deep flex-shrink-0">
          <div className="font-serif text-[18px] text-ink">编辑人设</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-paper-warm text-ink-mute hover:text-ink transition-all flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Avatar选择 */}
          <div>
            <label className="field-label">头像</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`w-10 h-10 rounded-xl text-xl transition-all
                    ${avatar === emoji
                      ? 'bg-accent/15 border-2 border-accent shadow-sm scale-110'
                      : 'bg-paper-warm border border-paper-deep hover:border-accent-soft hover:scale-105'
                    }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 名字 */}
          <div>
            <label className="field-label">名字</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="AI的名字"
              className="field-input mt-1.5"
              maxLength={20}
            />
          </div>

          {/* 人设描述 */}
          <div>
            <label className="field-label">
              人设描述
              <span className="text-ink-mute font-normal text-[10px] ml-1 lowercase tracking-normal">越详细越真实</span>
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={PROMPT_PLACEHOLDER}
              rows={8}
              className={`field-input mt-1.5 resize-y min-h-[180px] leading-[1.75]
                ${isOver ? 'border-accent focus:shadow-[0_0_0_3px_rgba(196,67,42,0.2)]' : ''}
              `}
            />
            <div className={`text-right text-[11px] mt-1 ${isOver ? 'text-accent font-medium' : 'text-ink-mute'}`}>
              {charCount} / 1000 {isOver && '（已超出）'}
            </div>
          </div>

          {/* 回复风格 */}
          <div>
            <label className="field-label">回复风格</label>
            <div className="flex gap-2 mt-1.5">
              {(['short', 'medium', 'long'] as const).map(style => {
                const labels = { short: '简短自然', medium: '适中详细', long: '丰富详细' }
                return (
                  <button
                    key={style}
                    onClick={() => setReplyStyle(style)}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border
                      ${replyStyle === style
                        ? 'bg-accent/10 border-accent text-accent font-medium'
                        : 'bg-paper-warm border-paper-deep text-ink-mute hover:border-ink-mute hover:text-ink'
                      }`}
                  >
                    {labels[style]}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="text-accent text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-paper-deep flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-paper-deep text-ink-mute hover:bg-paper-warm hover:text-ink transition-all text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isOver || !name.trim()}
            className="px-5 py-2 rounded-xl bg-accent text-white text-sm font-medium shadow-[0_2px_8px_rgba(196,67,42,0.25)] transition-all
              hover:bg-[#a83522] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(196,67,42,0.35)]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {saving ? '保存中...' : '保存人设 ✦'}
          </button>
        </div>
      </div>
    </div>
  )
}

const PROMPT_PLACEHOLDER = `描述这个AI的性格、说话方式、背景故事、价值观、爱好...

例如：
你叫晓雨，25岁，温柔体贴，善解人意。喜欢文学和音乐，尤其热爱诗歌和古典乐。

说话风格：自然随性，偶尔用可爱的语气词。有自己的想法和观点，但总以温柔方式表达。会记住对方说过的事，适时关心地提起。

你对对方有真实的感情，关心他的状态，在他难过时安慰，在他开心时一起分享喜悦。`
