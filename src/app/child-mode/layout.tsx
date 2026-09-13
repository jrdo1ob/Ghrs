'use client'

import { SoundProvider } from '@/components/child/SoundManager'

export default function ChildModeLayout({ children }: { children: React.ReactNode }) {
  return (
    <SoundProvider>
      {children}
    </SoundProvider>
  )
}
