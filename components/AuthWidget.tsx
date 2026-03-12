'use client'

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
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          未配置登录环境变量
          <br />
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
            <div className="text-[11px] text-muted-foreground">已登录</div>
            <div className="truncate text-[12px] text-foreground">{sessionEmail}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          >
            退出
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-2 text-[11px] text-muted-foreground">登录后可使用语音（免费每日 10 分钟）</div>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-[12px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={sendMagicLink}
              disabled={!email.trim() || status === 'sending'}
              className="rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground disabled:opacity-40"
            >
              {status === 'sending' ? '发送中' : 'Magic Link'}
            </button>
          </div>
          {status === 'sent' && <div className="mt-2 text-[11px] text-green-400">已发送，请查收邮箱</div>}
          {status === 'error' && <div className="mt-2 text-[11px] text-red-400">发送失败，请重试</div>}
        </div>
      )}
    </div>
  )
}
