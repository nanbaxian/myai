'use client'

// components/AuthWidget.tsx
// Minimal Magic Link login widget for Supabase Auth.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

type Props = {
  className?: string
}

export default function AuthWidget({ className }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  const canUseSupabase = useMemo(() => {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSessionEmail(data.session?.user?.email ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSessionEmail(sess?.user?.email ?? null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = async () => {
    if (!email.trim()) return
    setStatus('sending')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Important: allow returning to the same site after clicking the link.
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 5000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  if (!canUseSupabase) {
    return (
      <div className={className}>
        <div className="text-[11px] text-ink-mute leading-relaxed">
          未配置登录环境变量<br />
          <span className="text-[10px]">NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {sessionEmail ? (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] text-ink-mute">已登录</div>
            <div className="text-[12px] text-ink truncate">{sessionEmail}</div>
          </div>
          <button
            onClick={logout}
            className="px-2.5 py-1.5 rounded-lg border border-paper-deep text-[11px] text-ink-mute hover:text-ink hover:bg-paper transition-all"
          >
            退出
          </button>
        </div>
      ) : (
        <div>
          <div className="text-[11px] text-ink-mute mb-2">登录后可使用语音（免费每日 10 分钟）</div>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-paper-deep bg-white text-[12px] outline-none focus:border-accent-soft"
            />
            <button
              onClick={sendMagicLink}
              disabled={!email.trim() || status === 'sending'}
              className="px-3 py-2 rounded-lg bg-accent text-white text-[12px] disabled:opacity-40"
            >
              {status === 'sending' ? '发送中' : 'Magic Link'}
            </button>
          </div>
          {status === 'sent' && (
            <div className="text-[11px] text-green-600 mt-2">已发送，请查收邮箱</div>
          )}
          {status === 'error' && (
            <div className="text-[11px] text-red-500 mt-2">发送失败，请重试</div>
          )}
        </div>
      )}
    </div>
  )
}
