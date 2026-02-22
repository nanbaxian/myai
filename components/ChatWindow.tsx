'use client'

import { useEffect, useRef, useState } from 'react'
import { Persona, Message, ReplyLanguage } from '@/types'
import MessageBubble from './MessageBubble'
import InputArea from './InputArea'
import { motion } from 'framer-motion'

interface Props {
  persona: Persona | null
  messages: Message[]
  replyLanguage: ReplyLanguage
  onReplyLanguageChange: (lang: ReplyLanguage) => void
  onSendMessage: (text: string, imageBase64?: string, imagePreviewUrl?: string, replyLanguage?: ReplyLanguage) => void
}

export default function ChatWindow({
  persona,
  messages,
  replyLanguage,
  onReplyLanguageChange,
  onSendMessage,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [lastCompletedAiMsg, setLastCompletedAiMsg] = useState('')
  const isStreaming = messages.some(m => m.is_typing)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : ''
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant' && !last.is_typing && last.content && last.id.startsWith('ai-')) {
      setLastCompletedAiMsg(last.content)
    }
  }, [lastMsgId, messages])

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      <header className="flex items-center gap-3.5 px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-lg shadow-[0_0_15px_hsl(var(--glow-primary)/0.15)]">
          {persona?.avatar || '✨'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-base text-foreground truncate">{persona?.name || '加载中...'}</h2>
          <div className="text-xs text-muted-foreground mt-0.5">
            {isStreaming ? (
              <span className="text-primary animate-pulse">正在输入...</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary glow-dot" />
                <span>在线 · 等待你</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && persona && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center h-full text-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl mb-6 animate-float">
              {persona.avatar || '✨'}
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2">{persona.name}</h3>
            <p className="text-muted-foreground text-sm max-w-md leading-relaxed">说声你好，开始聊天吧 ✨</p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {['你好呀 👋', '今天心情怎么样？', '给我讲个故事'].map((hint, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(hint)}
                  className="px-4 py-2 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => {
          const isFirst = i === 0 || messages[i - 1].role !== msg.role
          return <MessageBubble key={msg.id} message={msg} persona={persona} isFirst={isFirst} />
        })}
        <div ref={messagesEndRef} />
      </div>

      <InputArea
        onSend={onSendMessage}
        disabled={isStreaming}
        persona={persona}
        replyLanguage={replyLanguage}
        onReplyLanguageChange={onReplyLanguageChange}
        lastAiMessage={lastCompletedAiMsg}
      />
    </div>
  )
}
