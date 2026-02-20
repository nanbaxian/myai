'use client'

// components/ChatWindow.tsx
// P1 版本：接 InputArea 的 lastAiMessage prop，支持 TTS 自动播报

import { useRef, useEffect, useState } from 'react'
import { Persona, Message } from '@/types'
import MessageBubble from './MessageBubble'
import InputArea from './InputArea'

interface Props {
  persona: Persona | null
  messages: Message[]
  onSendMessage: (text: string, imageBase64?: string, imagePreviewUrl?: string) => void
}

export default function ChatWindow({ persona, messages, onSendMessage }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 追踪最新完成的 AI 消息，用于触发 TTS
  const [lastCompletedAiMsg, setLastCompletedAiMsg] = useState<string>('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 检测 AI 消息完成：id 从 typing-xxx 变为 ai-xxx 时触发 TTS
  // 不能依赖 messages.length（流式更新时长度不变），改为追踪最后一条的 id
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : ''
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (
      last?.role === 'assistant' &&
      !last.is_typing &&
      last.content &&
      last.id.startsWith('ai-')
    ) {
      setLastCompletedAiMsg(last.content)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMsgId])

  const isStreaming = messages.some(m => m.is_typing)

  return (
    <main className="flex flex-col flex-1 overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-3.5 px-7 py-5 border-b border-paper-deep bg-paper/80 backdrop-blur-sm flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-soft to-accent flex items-center justify-center text-xl shadow-glow flex-shrink-0">
          {persona?.avatar || '🌸'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[17px] text-ink truncate">
            {persona?.name || '加载中...'}
          </div>
          <div className="text-xs text-ink-mute mt-0.5">
            {isStreaming
              ? <span className="text-accent animate-pulse">正在输入...</span>
              : <span>在线 · 等待你</span>
            }
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
        {messages.length === 0 && <WelcomeScreen persona={persona} />}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            persona={persona}
            isFirst={i === 0 || messages[i - 1].role !== msg.role}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <InputArea
        onSend={onSendMessage}
        disabled={isStreaming}
        persona={persona}
        lastAiMessage={lastCompletedAiMsg}
      />
    </main>
  )
}

function WelcomeScreen({ persona }: { persona: Persona | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center select-none">
      <div className="text-5xl mb-4 animate-float">{persona?.avatar || '🌸'}</div>
      <div className="font-serif text-xl text-ink mb-2">{persona?.name || 'AI 伴侣'}</div>
      <div className="text-sm text-ink-mute max-w-[260px] leading-relaxed">
        说声你好，开始聊天吧<br/>
        <span className="text-[11px] opacity-60">支持文字、语音、图片</span>
      </div>
    </div>
  )
}
