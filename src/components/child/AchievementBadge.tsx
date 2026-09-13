'use client'

import React from 'react'
import { TrophyIcon, LockIcon, CheckIcon } from '@/components/icons'

interface AchievementBadgeProps {
  title: string
  description: string
  icon?: string
  unlocked: boolean
  progress?: { current: number; max: number }
}

export default function AchievementBadge({ title, description, icon, unlocked, progress }: AchievementBadgeProps) {
  return (
    <div
      className="rounded-2xl p-3.5 transition-all"
      style={{
        background: 'var(--ghrs-bg-card)',
        border: unlocked ? '1.5px solid var(--ghrs-amber-300)' : '1.5px solid var(--ghrs-border-default)',
        opacity: unlocked ? 1 : 0.6,
        boxShadow: unlocked ? '0 2px 8px rgba(245, 158, 11, 0.06)' : 'var(--ghrs-shadow-sm)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: unlocked ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-secondary)',
            border: unlocked ? '1px solid var(--ghrs-amber-200)' : '1px solid var(--ghrs-border-default)',
          }}
        >
          {unlocked ? (
            icon ? <span className="text-lg">{icon}</span> : <TrophyIcon size={18} color="var(--ghrs-amber-600)" />
          ) : (
            <LockIcon size={16} color="var(--ghrs-text-tertiary)" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{title}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--ghrs-text-secondary)' }}>{description}</p>
          {progress && !unlocked && (
            <div className="mt-1.5">
              <div className="ghrs-progress-bar" style={{ height: '4px' }}>
                <div
                  className="ghrs-progress-fill"
                  style={{ width: `${Math.min(100, (progress.current / progress.max) * 100)}%` }}
                />
              </div>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                {progress.current} / {progress.max}
              </p>
            </div>
          )}
        </div>
        {unlocked && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--ghrs-green-100)', border: '1px solid var(--ghrs-green-200)' }}
          >
            <CheckIcon size={12} color="var(--ghrs-green-600)" />
          </div>
        )}
      </div>
    </div>
  )
}
