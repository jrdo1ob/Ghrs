'use client'

import React from 'react'
import Link from 'next/link'

interface QuickActionCardProps {
  href: string
  icon: React.ReactNode
  label: string
  color?: string
}

export default function QuickActionCard({ href, icon, label, color = 'var(--ghrs-green-50)' }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all active:scale-[0.95]"
      style={{
        background: 'var(--ghrs-bg-card)',
        border: '1.5px solid var(--ghrs-border-default)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color }}>
        {icon}
      </div>
      <span className="text-xs font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{label}</span>
    </Link>
  )
}
