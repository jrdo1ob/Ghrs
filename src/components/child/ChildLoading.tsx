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
        <div
          className="mb-5 mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ghrs-animate-float"
          style={{
            background: 'var(--ghrs-surface-success)',
            border: '1px solid var(--ghrs-green-200)',
            lineHeight: 1,
          }}
        >
          {icon || <LeafIcon size={32} color="var(--ghrs-green-600)" />}
        </div>
        <p
          className="text-[13px] font-bold"
          style={{ color: 'var(--ghrs-text-secondary)' }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
