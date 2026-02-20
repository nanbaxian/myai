'use client'

// app/page.tsx — P2 完整版

import { useState, useEffect } from 'react'
import Sidebar          from '@/components/Sidebar'
import ChatWindow       from '@/components/ChatWindow'
import PersonaModal     from '@/components/PersonaModal'
import MemoryManager    from '@/components/MemoryManager'
import PersonaSwitcher  from '@/components/PersonaSwitcher'
import { Persona, Message } from '@/types'

type Modal = 'persona' | 'memory' | 'switcher' | null

export default function Home() {
  const [persona,  setPersona]  = useState<Persona | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [modal,    setModal]    = useState<Modal>(null)
  const [loading,  setLoading]  = useState(true)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)

  // 启动时加载活跃人设
  useEffect(() => {
    fetch('/api/personas/active')
      .then(r => {
        if (!r.ok) throw new Error('load failed')
        return r.json() as Promise<Persona>
      })
      .then((data: Persona) => { setPersona(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // 切换人设时清空聊天记录（新的人设不应该有旧消息）
  const handlePersonaSwitch = (newPersona: Persona) => {
    setPersona(newPersona)
    setMessages([])
    setModal(null)
  }

  const handleSendMessage = async (
    text: string,
    imageUrl?: string,
    imagePreviewUrl?: string
  ) => {
    if (!text && !imageUrl) return

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      content_type: imageUrl ? 'image' : 'text',
      image_preview: imagePreviewUrl,
      created_at: new Date().toISOString(),
    }

    const typingId = 'typing-' + Date.now()
    const typingMsg: Message = {
      id: typingId,
      role: 'assistant',
      content: '',
      content_type: 'text',
      is_typing: true,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg, typingMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, imageUrl }),
      })

      if (!res.ok) throw new Error('API error')

      const reader     = res.body!.getReader()
      const decoder    = new TextDecoder()
      let aiContent    = ''
      let started      = false
      let lineBuffer   = ''   // BUG-2修复：跨 chunk 行缓冲

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value)
        const lines = lineBuffer.split('\n')
        lineBuffer  = lines.pop() ?? ''   // 保留不完整的最后一行

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              aiContent += data.text
              if (!started) {
                // 第一个token来了，把 typing 变成真实消息
                started = true
                setMessages(prev =>
                  prev.map(m => m.id === typingId
                    ? { ...m, is_typing: false, content: aiContent }
                    : m
                  )
                )
              } else {
                setMessages(prev =>
                  prev.map(m => m.id === typingId ? { ...m, content: aiContent } : m)
                )
              }
            }
            if (data.done) {
              setMessages(prev =>
                prev.map(m => m.id === typingId
                  ? { ...m, id: 'ai-' + Date.now(), is_typing: false, content: aiContent }
                  : m
                )
              )
              setSidebarRefreshKey(k => k + 1)
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === typingId
          ? { ...m, is_typing: false, id: 'err-' + Date.now(), content: '出了点小问题，再试一次？' }
          : m
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="text-ink-mute text-sm animate-pulse">正在加载...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <Sidebar
        persona={persona}
        onEditPersona={()   => setModal('persona')}
        onOpenMemory={()    => setModal('memory')}
        onSwitchPersona={() => setModal('switcher')}
        refreshKey={sidebarRefreshKey}
      />

      <ChatWindow
        persona={persona}
        messages={messages}
        onSendMessage={handleSendMessage}
      />

      {modal === 'persona' && (
        <PersonaModal
          persona={persona}
          onSave={p => { setPersona(p); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'memory' && (
        <MemoryManager onClose={() => setModal(null)} />
      )}

      {modal === 'switcher' && (
        <PersonaSwitcher
          currentPersona={persona}
          onSwitch={handlePersonaSwitch}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
