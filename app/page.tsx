'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatWindow from '@/components/ChatWindow'
import PersonaModal from '@/components/PersonaModal'
import MemoryManager from '@/components/MemoryManager'
import PersonaSwitcher from '@/components/PersonaSwitcher'
import ChatHistoryPanel from '@/components/ChatHistoryPanel'
import VoiceCallOverlay from '@/components/VoiceCallOverlay'
import { Persona, Message, ReplyLanguage } from '@/types'
import { apiUrl } from '@/lib/api-url'

type Modal = 'persona' | 'memory' | 'switcher' | null

const DEFAULT_PERSONA: Persona = {
  id: 'default',
  name: 'Xiaoyu',
  avatar: '*',
  reply_style: 'medium',
  prompt: 'You are Xiaoyu, a warm and empathetic companion.',
}

export default function Home() {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [modal, setModal] = useState<Modal>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const [replyLanguage, setReplyLanguage] = useState<ReplyLanguage>('zh')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [voiceCallOpen, setVoiceCallOpen] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/personas/active'))
      .then(r => {
        if (!r.ok) throw new Error('load failed')
        return r.json() as Promise<Persona>
      })
      .then((data: Persona) => {
        setPersona(data?.id ? data : DEFAULT_PERSONA)
        setLoading(false)
      })
      .catch(() => {
        setPersona(DEFAULT_PERSONA)
        setLoading(false)
      })
  }, [])

  const activePersona = persona ?? DEFAULT_PERSONA

  const handlePersonaSwitch = (newPersona: Persona) => {
    setPersona(newPersona)
    setMessages([])
    setModal(null)
  }

  const handleSendMessage = async (
    text: string,
    imageUrl?: string,
    imagePreviewUrl?: string,
    lang: ReplyLanguage = replyLanguage,
  ): Promise<string | null> => {
    if (!text && !imageUrl) return null

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
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, imageUrl, replyLanguage: lang }),
      })

      if (!res.ok) throw new Error('API error')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream body')

      const decoder = new TextDecoder()
      let aiContent = ''
      let started = false
      let finished = false
      let lineBuffer = ''
      let streamError = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value)
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6)) as { text?: string; error?: string; done?: boolean }
            if (data.text) {
              aiContent += data.text
              if (!started) {
                started = true
                setMessages(prev => prev.map(m => (m.id === typingId ? { ...m, is_typing: false, content: aiContent } : m)))
              } else {
                setMessages(prev => prev.map(m => (m.id === typingId ? { ...m, content: aiContent } : m)))
              }
            }
            if (data.error) streamError = String(data.error)
            if (data.done) {
              finished = true
              const finalText = aiContent || 'I could not generate content, please try again.'
              setMessages(prev =>
                prev.map(m =>
                  m.id === typingId
                    ? { ...m, id: 'ai-' + Date.now(), is_typing: false, content: finalText }
                    : m,
                ),
              )
              setSidebarRefreshKey(k => k + 1)
              return finalText
            }
          } catch {
            // ignore invalid chunks
          }
        }
      }

      if (!finished) {
        setMessages(prev =>
          prev.map(m =>
            m.id === typingId
              ? {
                  ...m,
                  is_typing: false,
                  id: 'err-' + Date.now(),
                  content: streamError ? `Request failed: ${streamError}` : 'No reply received, please retry.',
                }
              : m,
          ),
        )
      }
      return null
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === typingId
            ? { ...m, is_typing: false, id: 'err-' + Date.now(), content: 'Something went wrong, please retry.' }
            : m,
        ),
      )
      return null
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        persona={activePersona}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onEditPersona={() => setModal('persona')}
        onOpenMemory={() => setModal('memory')}
        onSwitchPersona={() => setModal('switcher')}
        onOpenHistory={() => setHistoryOpen(true)}
        onStartVoiceCall={() => setVoiceCallOpen(true)}
        refreshKey={sidebarRefreshKey}
      />

      <ChatHistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />

      <ChatWindow
        persona={activePersona}
        messages={messages}
        replyLanguage={replyLanguage}
        onReplyLanguageChange={setReplyLanguage}
        onSendMessage={handleSendMessage}
        onStartVoiceCall={() => setVoiceCallOpen(true)}
        voiceCallOpen={voiceCallOpen}
      />

      {modal === 'persona' && (
        <PersonaModal
          persona={activePersona}
          onSave={p => {
            setPersona(p)
            setModal(null)
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'memory' && <MemoryManager onClose={() => setModal(null)} />}

      {modal === 'switcher' && (
        <PersonaSwitcher currentPersona={activePersona} onSwitch={handlePersonaSwitch} onClose={() => setModal(null)} />
      )}

      {voiceCallOpen && (
        <VoiceCallOverlay
          persona={activePersona}
          isOpen={voiceCallOpen}
          onClose={() => setVoiceCallOpen(false)}
          replyLanguage={replyLanguage}
          onVoiceTurn={(text, lang) => handleSendMessage(text, undefined, undefined, lang)}
        />
      )}
    </div>
  )
}
