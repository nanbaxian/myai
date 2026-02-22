'use client'

import { useEffect, useState } from 'react'
import { Persona } from '@/types'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react'

interface Props {
  persona: Persona
  isOpen: boolean
  onClose: () => void
}

export default function VoiceCallOverlay({ persona, isOpen, onClose }: Props) {
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOff, setIsSpeakerOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [aiSpeaking, setAiSpeaking] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0)
      return
    }
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => setAiSpeaking(prev => !prev), 3000)
    return () => clearInterval(interval)
  }, [isOpen])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative z-10 flex flex-col items-center gap-8 px-8"
          >
            <div className="relative">
              {aiSpeaking && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border-2 border-primary"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.4], opacity: [0.2, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                    className="absolute inset-0 rounded-full border-2 border-primary"
                  />
                </>
              )}

              <div
                className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl border-2 transition-all duration-500 ${
                  aiSpeaking
                    ? 'bg-primary/20 border-primary shadow-[0_0_40px_hsl(var(--glow-primary)/0.4)]'
                    : 'bg-primary/10 border-primary/20'
                }`}
              >
                {persona.avatar || '✨'}
              </div>
            </div>

            <div className="text-center">
              <h2 className="font-serif text-2xl text-foreground mb-1">{persona.name}</h2>
              <p className="text-muted-foreground text-sm">{aiSpeaking ? '正在说话...' : '正在聆听...'}</p>
              <p className="text-primary text-sm mt-2 font-mono">{formatTime(callDuration)}</p>
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-destructive/20 text-destructive border border-destructive/30'
                    : 'bg-secondary text-foreground border border-border hover:bg-secondary/80'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={onClose}
                className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:brightness-110 transition-all shadow-[0_0_20px_hsl(0_70%_50%/0.3)]"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={() => setIsSpeakerOff(!isSpeakerOff)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeakerOff
                    ? 'bg-destructive/20 text-destructive border border-destructive/30'
                    : 'bg-secondary text-foreground border border-border hover:bg-secondary/80'
                }`}
              >
                {isSpeakerOff ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
