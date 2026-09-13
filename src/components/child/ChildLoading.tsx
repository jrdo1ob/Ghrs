'use client'

import React from 'react'
import { LeafIcon } from '@/components/icons'

interface ChildLoadingProps {
  text?: string
  icon?: React.ReactNode
}

export default function ChildLoading({ text = 'جاري التحميل...', icon }: ChildLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div className="text-center">
        <div className="mb-4 ghrs-animate-float" style={{ lineHeight: 1 }}>
          {icon || <LeafIcon size={48} color="var(--ghrs-green-500)" />}
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>{text}</p>
      </div>
    </div>
  )
}
