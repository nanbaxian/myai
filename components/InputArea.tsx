'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2, Mic, MicOff, SendHorizontal, X } from 'lucide-react'
import { Persona, ReplyLanguage } from '@/types'
import { supabase } from '@/lib/supabase-browser'

interface Props {
  onSend: (text: string, imageUrl?: string, imagePreviewUrl?: string, replyLanguage?: ReplyLanguage) => void
  disabled?: boolean
  persona: Persona | null
  replyLanguage: ReplyLanguage
  onReplyLanguageChange: (lang: ReplyLanguage) => void
  lastAiMessage?: string
}

async function uploadFileToR2(file: File, token: string): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error('upload failed')
  return await res.json()
}

function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || 'application/octet-stream' })
}

function getBlobDurationMs(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.src = url
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (!Number.isFinite(audio.duration)) return reject(new Error('Invalid duration'))
      resolve(audio.duration * 1000)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load audio metadata'))
    }
  })
}

export default function InputArea({
  onSend,
  disabled,
  persona,
  replyLanguage,
  onReplyLanguageChange,
}: Props) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ preview: string } | null>(null)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [sttError, setSttError] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const replyLanguageRef = useRef<ReplyLanguage>(replyLanguage)

  useEffect(() => {
    replyLanguageRef.current = replyLanguage
  }, [replyLanguage])

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = await compressImage(file, 800 * 1024)
    setPendingImage({ preview })
    setPendingImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      setIsRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        setIsTranscribing(true)
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'

          const sess = await supabase.auth.getSession()
          const token = sess.data.session?.access_token
          if (!token) {
            setSttError('请先登录后使用语音')
            setTimeout(() => setSttError(''), 3000)
            return
          }

          const durationMs = await getBlobDurationMs(blob).catch(() => 30000)
          const audioFile = blobToFile(blob, `recording.${ext}`)
          const up = await uploadFileToR2(audioFile, token)

          const res = await fetch('/api/voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              audioUrl: up.url,
              durationSeconds: Math.ceil(Math.max(1, Math.floor(durationMs)) / 1000),
              replyLanguage: replyLanguageRef.current,
            }),
          })
          if (!res.ok) throw new Error('STT error')

          const { text: transcribed } = (await res.json()) as { text?: string }
          if (transcribed?.trim()) {
            setText(prev => (prev ? prev + ' ' + transcribed : transcribed))
            setTimeout(() => {
              autoResize()
              textareaRef.current?.focus()
            }, 50)
          }
        } catch {
          setSttError('语音识别失败，请重试')
          setTimeout(() => setSttError(''), 3000)
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start(250)
      setIsRecording(true)
    } catch {
      setSttError('无法访问麦克风，请检查浏览器权限')
      setTimeout(() => setSttError(''), 3000)
    }
  }, [isRecording])

  const handleSend = () => {
    const trimmed = text.trim()
    if ((!trimmed && !pendingImage) || disabled) return

    ;(async () => {
      if (pendingImageFile) {
        const sess = await supabase.auth.getSession()
        const token = sess.data.session?.access_token
        if (!token) {
          setSttError('请先登录后发送图片')
          setTimeout(() => setSttError(''), 3000)
          return
        }
        const up = await uploadFileToR2(pendingImageFile, token)
        onSend(trimmed, up.url, pendingImage?.preview, replyLanguageRef.current)
      } else {
        onSend(trimmed, undefined, undefined, replyLanguageRef.current)
      }

      setText('')
      setPendingImage(null)
      setPendingImageFile(null)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    })()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-5 py-3 border-t border-border bg-card/70 backdrop-blur-sm flex-shrink-0">
      {pendingImage && (
        <div className="mb-3 relative inline-block">
          <img src={pendingImage.preview} alt="preview" className="h-16 w-auto rounded-lg border border-border object-cover" />
          <button
            onClick={() => {
              setPendingImage(null)
              setPendingImageFile(null)
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-secondary text-muted-foreground text-xs flex items-center justify-center hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => fileInputRef.current?.click()} className="tool-btn" title="上传图片" disabled={disabled}>
          <ImageIcon className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        <button
          onClick={toggleRecording}
          disabled={disabled || isTranscribing}
          title={isRecording ? '停止录音' : '按住说话'}
          className={`tool-btn ${isRecording ? 'bg-primary/10 !border-primary !text-primary animate-record-pulse' : ''}`}
        >
          {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <select
          value={replyLanguage}
          onChange={e => {
            const lang = e.target.value as ReplyLanguage
            replyLanguageRef.current = lang
            onReplyLanguageChange(lang)
          }}
          className="h-10 border border-transparent bg-transparent px-1 text-[12px] lowercase text-muted-foreground outline-none"
          title="语言"
          disabled={disabled}
        >
          <option value="zh">cn</option>
          <option value="en">en</option>
        </select>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => {
              setText(e.target.value)
              autoResize()
            }}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? '录音中...' : `和${persona?.name || '她'}说点什么...`}
            rows={1}
            disabled={disabled || isRecording}
            className="w-full min-h-[54px] max-h-[120px] px-5 py-[14px] pr-16 rounded-2xl border border-border bg-input
              text-foreground text-[14px] leading-[1.35] resize-none outline-none transition-all
              placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20
              disabled:opacity-60 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleSend}
            disabled={disabled || (!text.trim() && !pendingImage)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center
              transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {(sttError || isTranscribing) && (
        <div className="mt-2 text-[11px] text-muted-foreground">{isTranscribing ? '识别中...' : sttError}</div>
      )}
    </div>
  )
}

async function compressImage(file: File, maxBytes: number): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const maxDim = 1600
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

        let quality = 0.85
        let result = canvas.toDataURL('image/jpeg', quality)
        while (result.length > maxBytes * 1.37 && quality > 0.3) {
          quality -= 0.1
          result = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(result)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}
