'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

interface SoundContextType {
  enabled: boolean
  toggle: () => void
  play: (sound: SoundType) => void
}

type SoundType = 'click' | 'complete' | 'levelup' | 'achievement' | 'gift' | 'error'

const SoundContext = createContext<SoundContextType>({
  enabled: true,
  toggle: () => {},
  play: () => {},
})

export function useSound() {
  return useContext(SoundContext)
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ghrs-sound-enabled')
      return stored !== 'false'
    }
    return true
  })

  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!enabled) return
    try {
      const ctx = getAudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = frequency
      oscillator.type = type
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // Audio not available
    }
  }, [enabled, getAudioContext])

  const play = useCallback((sound: SoundType) => {
    if (!enabled) return
    switch (sound) {
      case 'click':
        playTone(800, 0.05)
        break
      case 'complete':
        playTone(523, 0.1)
        setTimeout(() => playTone(659, 0.1), 100)
        setTimeout(() => playTone(784, 0.15), 200)
        break
      case 'levelup':
        playTone(523, 0.15)
        setTimeout(() => playTone(659, 0.15), 150)
        setTimeout(() => playTone(784, 0.15), 300)
        setTimeout(() => playTone(1047, 0.3), 450)
        break
      case 'achievement':
        playTone(784, 0.1)
        setTimeout(() => playTone(988, 0.1), 100)
        setTimeout(() => playTone(1175, 0.2), 200)
        break
      case 'gift':
        playTone(659, 0.1)
        setTimeout(() => playTone(784, 0.15), 100)
        break
      case 'error':
        playTone(330, 0.15, 'sawtooth')
        break
    }
  }, [enabled, playTone])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      localStorage.setItem('ghrs-sound-enabled', String(next))
      return next
    })
  }, [])

  return (
    <SoundContext.Provider value={{ enabled, toggle, play }}>
      {children}
    </SoundContext.Provider>
  )
}
