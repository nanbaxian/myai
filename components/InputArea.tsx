'use client'

// components/InputArea.tsx
// P1 完整版：文字 + 语音录制(Whisper) + 图片上传 + TTS 播放

import { useState, useRef, useCallback, useEffect } from 'react'
import { Persona, ReplyLanguage } from '@/types'
import { supabase } from '@/lib/supabase-browser'

interface Props {
  onSend: (text: string, imageUrl?: string, imagePreviewUrl?: string, replyLanguage?: ReplyLanguage) => void
  disabled?: boolean
  persona: Persona | null
  replyLanguage: ReplyLanguage
  onReplyLanguageChange: (lang: ReplyLanguage) => void
  // P1新增：AI回复完成后触发TTS
  lastAiMessage?: string
}


async function uploadFileToR2(file: File, token: string): Promise<{ url: string; key: string; contentType: string }> {
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

async function blobToFile(blob: Blob, filename: string): Promise<File> {
  return new File([blob], filename, { type: blob.type || 'application/octet-stream' })
}

export default function InputArea({
  onSend,
  disabled,
  persona,
  replyLanguage,
  onReplyLanguageChange,
  lastAiMessage,
}: Props) {
  type TtsMode = 'api' | 'browser'
  const [text, setText]               = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isTTSPlaying, setIsTTSPlaying]     = useState(false)
  const [ttsEnabled, setTtsEnabled]         = useState(false)
  const [ttsMode, setTtsMode]               = useState<TtsMode>('api')
  const [pendingImage, setPendingImage]      = useState<{ base64: string; preview: string } | null>(null)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [sttError, setSttError]             = useState('')

  const textareaRef      = useRef<HTMLTextAreaElement>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)

  // ================================================
  // TTS：AI 回复后自动播放（如果开启）
  // ================================================
  useEffect(() => {
    if (!lastAiMessage || !ttsEnabled || isTTSPlaying) return
    playTTS(lastAiMessage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAiMessage])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('tts_mode')
      if (saved === 'api' || saved === 'browser') setTtsMode(saved)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('tts_mode', ttsMode)
    } catch {}
  }, [ttsMode])

  const browserTtsLang = replyLanguage === 'en' ? 'en-US' : 'zh-CN'

  const playTTS = async (content: string) => {
    if (!content.trim()) return
    // 截取前150字，避免TTS太长
    const short = content.slice(0, 150)
    setIsTTSPlaying(true)
    try {
      if (ttsMode === 'browser') {
        if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
          setSttError('当前浏览器不支持内置TTS')
          setTimeout(() => setSttError(''), 3000)
          setIsTTSPlaying(false)
          return
        }
        window.speechSynthesis.cancel()
        const utter = new SpeechSynthesisUtterance(short)
        utter.lang = browserTtsLang
        utter.rate = 1
        utter.pitch = 1
        const voices = window.speechSynthesis.getVoices()
        const voice = voices.find(v => v.lang.toLowerCase().startsWith(browserTtsLang.slice(0, 2).toLowerCase()))
        if (voice) utter.voice = voice
        utter.onend = () => setIsTTSPlaying(false)
        utter.onerror = () => setIsTTSPlaying(false)
        window.speechSynthesis.speak(utter)
        return
      }

      const sess = await supabase.auth.getSession()
      const token = sess.data.session?.access_token
      if (!token) {
        setSttError('请先登录后使用语音')
        setTimeout(() => setSttError(''), 3000)
        setIsTTSPlaying(false)
        return
      }
      const res = await fetch(`/api/voice?text=${encodeURIComponent(short)}&lang=${encodeURIComponent(replyLanguage)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)

      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setIsTTSPlaying(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setIsTTSPlaying(false)
      await audio.play()
    } catch {
      setIsTTSPlaying(false)
    }
  }

  const stopTTS = () => {
    audioRef.current?.pause()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setIsTTSPlaying(false)
  }

  // 读取 Blob 音频时长（ms）
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

  // ================================================
  // 语音录制 → Whisper STT
  // ================================================
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // 停止录音
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        audioChunksRef.current = []

        // 优先 webm，Safari 回退 mp4
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
            const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm'

            const sess = await supabase.auth.getSession()
            const token = sess.data.session?.access_token
            if (!token) {
              setSttError('请先登录后使用语音')
              setTimeout(() => setSttError(''), 3000)
              return
            }

            // 计算音频时长（用于免费配额扣减更准确）
            const durationMs = await getBlobDurationMs(blob).catch(() => 30_000)

            const audioFile = await blobToFile(blob, `recording.${ext}`)

            // 先上传到 R2
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
                replyLanguage,
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
            // 识别失败时把错误文字插入输入框，让用户知道
            setText(prev => prev ? prev : '')
            setSttError('语音识别失败，请重试')
            setTimeout(() => setSttError(''), 3000)
          } finally {
            setIsTranscribing(false)
          }
        }

        recorder.start(250) // 每250ms收一次chunk，减少丢失
        setIsRecording(true)
      } catch {
        alert('无法访问麦克风，请在浏览器设置中允许麦克风权限')
      }
    }
  }, [isRecording, replyLanguage])

  // ================================================
  // 图片上传 + 压缩
  // ================================================
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl  = await compressImage(file, 800 * 1024) // 压缩到800KB以内
    const base64   = dataUrl.split(',')[1]
    setPendingImage({ base64, preview: dataUrl })
    setPendingImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ================================================
  // 发送
  // ================================================
  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 130) + 'px'
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && !pendingImage) return
    if (disabled) return
    ;
    (async () => {
      if (pendingImageFile) {
        const sess = await supabase.auth.getSession()
        const token = sess.data.session?.access_token
        if (!token) {
          setSttError('请先登录后发送图片')
          setTimeout(() => setSttError(''), 3000)
          return
        }
        const up = await uploadFileToR2(pendingImageFile, token)
        onSend(trimmed, up.url, pendingImage?.preview, replyLanguage)
      } else {
        onSend(trimmed, undefined, undefined, replyLanguage)
      }
    })()
    setText('')
    setPendingImage(null)
    setPendingImageFile(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ================================================
  // UI
  // ================================================
  return (
    <div className="px-7 pb-5 pt-4 border-t border-paper-deep bg-paper/80 backdrop-blur-sm flex-shrink-0">

      {/* 图片预览 */}
      {pendingImage && (
        <div className="mb-3 relative inline-block">
          <img
            src={pendingImage.preview}
            alt="待发送"
            className="h-16 w-auto rounded-lg border border-paper-deep shadow-sm object-cover"
          />
          <button
            onClick={() => {
              setPendingImage(null)
              setPendingImageFile(null)
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-paper text-xs flex items-center justify-center hover:bg-accent transition-colors"
          >✕</button>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center gap-2 mb-2.5">
        {/* 图片 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="tool-btn" title="上传图片" disabled={disabled}
        >🖼</button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        {/* TTS 开关 */}
        <button
          onClick={() => { if (isTTSPlaying) stopTTS(); setTtsEnabled(v => !v) }}
          className={`tool-btn ${ttsEnabled ? 'bg-accent/10 !border-accent !text-accent' : ''}`}
          title={ttsEnabled ? '关闭语音回复' : '开启语音回复'}
        >
          {isTTSPlaying ? '⏹' : '🔊'}
        </button>
        <button
          onClick={() => setTtsMode(m => (m === 'api' ? 'browser' : 'api'))}
          className={`tool-btn ${ttsMode === 'browser' ? 'bg-accent/10 !border-accent !text-accent' : ''}`}
          title={ttsMode === 'browser' ? '当前：浏览器TTS（点击切到API）' : '当前：API TTS（点击切到浏览器）'}
        >
          {ttsMode === 'browser' ? '🌐' : '☁️'}
        </button>

        {/* 转录中提示 / 错误提示 */}
        {isTranscribing && (
          <span className="text-[11px] text-accent animate-pulse">识别中...</span>
        )}
        {sttError && (
          <span className="text-[11px] text-red-500">{sttError}</span>
        )}

        <div className="flex-1" />
        <select
          value={replyLanguage}
          onChange={e => onReplyLanguageChange(e.target.value as ReplyLanguage)}
          className="h-8 rounded-lg border border-paper-deep bg-white px-2 text-[12px] text-ink outline-none focus:border-accent-soft"
          title="Reply language"
          disabled={disabled}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* 输入行 */}
      <div className="flex gap-2.5 items-end">

        {/* 语音按钮 */}
        <button
          onClick={toggleRecording}
          disabled={disabled || isTranscribing}
          title={isRecording ? '停止录音' : '按住说话'}
          className={`w-11 h-11 rounded-xl border flex items-center justify-center text-lg transition-all flex-shrink-0
            ${isRecording
              ? 'bg-accent/10 border-accent text-accent animate-record-pulse'
              : 'bg-white border-paper-deep text-ink-mute hover:border-accent-soft hover:text-accent shadow-sm'
            }
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isTranscribing ? (
            <span className="text-xs animate-spin">⟳</span>
          ) : isRecording ? '⏹' : '🎙'}
        </button>

        {/* 文字输入框 */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? '录音中...' : `和${persona?.name || '她'}说点什么...`}
          rows={1}
          disabled={disabled || isRecording}
          className="flex-1 min-h-[44px] max-h-[130px] px-4 py-[11px] rounded-xl border border-paper-deep bg-white
            text-ink text-[14px] leading-[1.6] resize-none outline-none transition-all shadow-sm
            placeholder:text-ink-mute
            focus:border-accent-soft focus:shadow-[0_0_0_3px_rgba(196,67,42,0.12)]
            disabled:opacity-60 disabled:cursor-not-allowed"
        />

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !pendingImage)}
          className="w-11 h-11 rounded-xl bg-accent text-white text-xl flex items-center justify-center
            flex-shrink-0 shadow-[0_2px_8px_rgba(196,67,42,0.3)] transition-all
            hover:bg-[#a83522] hover:shadow-[0_4px_12px_rgba(196,67,42,0.4)] hover:-translate-y-px
            active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        >↑</button>
      </div>
    </div>
  )
}

// ================================================
// 图片压缩（纯浏览器，无依赖）
// ================================================
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
          width  = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

        let quality = 0.85
        let result  = canvas.toDataURL('image/jpeg', quality)
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
