'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ArrowUpRight, Sparkles } from 'lucide-react'

type ChatMessage = { id: number; role: 'user' | 'assistant'; content: string }

export default function KnowledgeChatDemo({ botId }: { botId: string }) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const message = input.trim()
    if (!message || sending) return

    const nextId = messages.length
    setInput('')
    setSending(true)
    setMessages(prev => [
      ...prev,
      { id: nextId, role: 'user', content: message },
      { id: nextId + 1, role: 'assistant', content: '' },
    ])
    const replyId = nextId + 1

    try {
      const token = await getToken()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, bot_id: botId, replyLanguage: 'zh' }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let lineBuffer = ''
      let aiContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6)) as { text?: string; error?: string }
          if (data.error) throw new Error(data.error)
          if (data.text) {
            aiContent += data.text
            setMessages(prev => prev.map(m => (m.id === replyId ? { ...m, content: aiContent } : m)))
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m => (m.id === replyId ? { ...m, content: '请求失败，请稍后重试。' } : m)),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0e13] px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-amber-100/80">{botId}</div>
              <h1 className="mt-2 text-xl font-semibold">Knowledge Assistant</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              知识库问答
            </div>
          </div>

          <div className="space-y-4 py-5">
            {messages.length === 0 && (
              <div className="text-sm text-white/50">请输入问题，助手会基于已上传的知识库文档回答。</div>
            )}
            {messages.map(m =>
              m.role === 'user' ? (
                <div
                  key={m.id}
                  className="ml-auto max-w-2xl rounded-[1.5rem] rounded-br-md border border-amber-300/20 bg-amber-300 px-4 py-4 text-sm leading-7 text-slate-950"
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="max-w-2xl whitespace-pre-wrap rounded-[1.5rem] rounded-bl-md border border-white/10 bg-white/6 px-4 py-4 text-sm leading-7 text-white/80"
                >
                  {m.content || (sending ? '…' : '')}
                </div>
              ),
            )}
          </div>

          <form
            className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4"
            onSubmit={e => {
              e.preventDefault()
              void handleSend()
            }}
          >
            <label htmlFor="chat-question" className="text-xs uppercase tracking-[0.24em] text-white/45">
              提问
            </label>
            <div className="mt-3 flex gap-3">
              <input
                id="chat-question"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="输入你的问题"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 disabled:opacity-50"
              >
                发送
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
