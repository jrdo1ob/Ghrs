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
      className="rounded-xl p-3 transition-all"
      style={{
        background: unlocked ? 'var(--ghrs-surface-pending)' : 'var(--ghrs-bg-secondary)',
        border: unlocked ? '1px solid var(--ghrs-amber-300)' : '1px solid var(--ghrs-border-default)',
        opacity: unlocked ? 1 : 0.55,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: unlocked ? 'var(--ghrs-bg-card)' : 'var(--ghrs-bg-card)',
            border: unlocked ? '1px solid var(--ghrs-amber-200)' : '1px solid var(--ghrs-border-default)',
          }}
        >
          {unlocked ? (
            icon ? <span className="text-lg leading-none">{icon}</span> : <TrophyIcon size={18} color="var(--ghrs-amber-600)" />
          ) : (
            <LockIcon size={16} color="var(--ghrs-text-tertiary)" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[12px] font-bold truncate"
            style={{
              color: unlocked ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-secondary)',
            }}
          >
            {title}
          </p>
          <p
            className="text-[10px] mt-0.5 truncate"
            style={{ color: 'var(--ghrs-text-secondary)' }}
          >
            {description}
          </p>
          {progress && !unlocked && (
            <div className="mt-1.5">
              <div className="ghrs-garden-xp-bar" style={{ height: '4px' }}>
                <div
                  className="ghrs-garden-xp-fill"
                  style={{ width: `${Math.min(100, (progress.current / progress.max) * 100)}%` }}
                />
              </div>
              <p
                className="text-[9px] mt-0.5 tabular-nums"
                style={{ color: 'var(--ghrs-text-tertiary)' }}
              >
                {progress.current} / {progress.max}
              </p>
            </div>
          )}
        </div>
        {unlocked && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--ghrs-surface-success)',
              border: '1px solid var(--ghrs-green-300)',
            }}
          >
            <CheckIcon size={12} color="var(--ghrs-green-700)" />
          </div>
        )}
      </div>
    </div>
  )
}
