'use client'

import { Message, Persona } from '@/types'

interface Props {
  message: Message
  persona: Persona | null
  isFirst: boolean
}

export default function MessageBubble({ message, persona, isFirst }: Props) {
  const isAI = message.role === 'assistant'
  const isUser = message.role === 'user'
  const now = new Date(message.created_at)
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className={`flex gap-3 items-end animate-fade-up ${isUser ? 'flex-row-reverse' : ''}`}>

      {/* Avatar - 只在第一条或角色切换时显示 */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base
        ${isAI
          ? 'bg-gradient-to-br from-accent-soft to-accent shadow-glow'
          : 'bg-paper-deep text-ink-mute text-xs'
        }
        ${!isFirst ? 'invisible' : ''}
      `}>
        {isAI ? (persona?.avatar || '🌸') : '我'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[66%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>

        {/* 图片消息 */}
        {message.content_type === 'image' && (message.image_preview || message.image_url) && (
          <div className="rounded-xl overflow-hidden border border-paper-deep shadow-sm max-w-[260px]">
            <img
              src={message.image_preview || message.image_url}
              alt="图片"
              className="w-full block"
              loading="lazy"
            />
          </div>
        )}

        {/* 文字内容 */}
        {(message.content || message.is_typing) && (
          <div className={`px-4 py-3 rounded-2xl text-[14.5px] leading-[1.75] relative
            ${isAI
              ? 'bg-white border border-paper-deep shadow-sm text-ink rounded-bl-[4px]'
              : 'bg-ink text-paper rounded-br-[4px]'
            }
          `}>
            {message.is_typing ? (
              <TypingDots />
            ) : (
              <span className="whitespace-pre-wrap break-words">{message.content}</span>
            )}

            {/* 流式光标 */}
            {isAI && !message.is_typing && message.content && message.id.startsWith('typing-') && (
              <span className="inline-block w-[2px] h-[1em] bg-accent ml-0.5 animate-blink align-middle" />
            )}
          </div>
        )}

        {/* 时间戳 */}
        {!message.is_typing && (
          <div className={`text-[11px] text-ink-mute ${isUser ? 'text-right' : 'text-left'}`}>
            {time}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 py-0.5 px-1 items-center">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typing"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}
