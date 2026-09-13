'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChildBottomNav } from '@/components/layout'
import { LEVELS, getLevel, getNextLevel, Level } from '@/lib/gamification'
import ThemeToggle from '@/components/child/ThemeToggle'
import ChildLoading from '@/components/child/ChildLoading'
import { GardenIcon, PartyIcon, TrophyIcon, ShieldIcon, CheckIcon, LockIcon, FireIcon, WaterIcon, SparkleIcon } from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

export default function ChildGardenPage() {
  const [xp, setXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const authUser = await getCurrentUser()
      if (!authUser || authUser.role !== 'child') {
        router.push('/family-login')
        return
      }

      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'garden' }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        router.push('/family-login')
        return
      }

      setMember(result.member)
      setXp(result.xp)
      setLoading(false)
    }

    getData()
  }, [])

  const level = getLevel(xp)
  const nextLevel = getNextLevel(level)
  const progressToNext = nextLevel
    ? ((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100
    : 100

  const today = new Date().toISOString().split('T')[0]
  const lastActive = member?.last_active_date
  const isThirsty = lastActive && lastActive < today &&
    (new Date().getTime() - new Date(lastActive).getTime()) > 86400000

  if (loading) {
    return <ChildLoading text="جاري تحميل حديقتك..." icon={<GardenIcon size={48} color="var(--ghrs-green-500)" />} />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        <div className="flex justify-end mb-3">
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="mb-5 text-center">
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--ghrs-text-primary)' }}>
            حديقتي
          </h1>
        </div>

        {/* Garden Display */}
        <div
          className="mb-5 text-center relative overflow-hidden rounded-3xl p-8"
          style={{
            background: `linear-gradient(170deg, var(--ghrs-green-50) 0%, var(--ghrs-bg-card) 65%, ${level.soilColor}18 100%)`,
            border: '1.5px solid var(--ghrs-green-200)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          <div className="absolute top-3 right-5 opacity-10"><SparkleIcon size={18} /></div>
          <div className="absolute top-7 left-7 opacity-[0.07]"><SparkleIcon size={12} /></div>

          <div className="relative">
            {/* Thirsty indicator */}
            {isThirsty && (
              <div className="absolute -top-2 right-3 ghrs-animate-bounce" title="حديقتك تنتظر الماء!">
                <WaterIcon size={24} />
              </div>
            )}

            {/* Plant */}
            <div
              className={`relative mb-5 ${level.plantSize} transition-all duration-700`}
              style={{
                filter: isThirsty
                  ? 'opacity(0.5) grayscale(1)'
                  : 'drop-shadow(0 4px 10px rgba(0,0,0,0.08))',
              }}
            >
              {level.emoji}
            </div>

            {/* Thirsty message */}
            {isThirsty && (
              <p
                className="text-xs font-bold mb-3"
                style={{ color: 'var(--ghrs-blue-600)' }}
              >
                حديقتك تنتظر الماء! أنجز مهمة لسقايتها
              </p>
            )}

            {/* Soil */}
            <div
              className="relative h-5 rounded-b-xl"
              style={{
                background: `linear-gradient(to top, ${level.soilColor}, ${level.soilColor}bb)`,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-20"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
              />
            </div>
          </div>
        </div>

        {/* Level Info */}
        <div
          className="rounded-3xl p-5 mb-5 text-center"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1.5px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="text-3xl mb-2">{level.emoji}</div>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>
            المستوى {level.level}: {level.name}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
            {level.description}
          </p>

          {nextLevel && (
            <>
              <div className="ghrs-progress-bar mb-2">
                <div
                  className="ghrs-progress-fill"
                  style={{ width: `${Math.min(100, progressToNext)}%` }}
                />
              </div>
              <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                {xp} / {nextLevel.minXp} XP للمستوى التالي
              </p>
            </>
          )}

          {!nextLevel && (
            <p className="text-xs font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
              وصلت لأعلى مستوى! أنت حديقة مزهرة!
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div
          className="rounded-3xl p-4 mb-5"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1.5px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}
              >
                <FireIcon size={18} color="var(--ghrs-amber-600)" />
              </div>
              <p className="text-lg font-extrabold" style={{ color: 'var(--ghrs-amber-600)' }}>
                {member?.current_streak || 0}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>السلسلة</p>
            </div>
            <div className="p-2">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'var(--ghrs-purple-50)', border: '1px solid var(--ghrs-purple-200)' }}
              >
                <TrophyIcon size={18} color="var(--ghrs-purple-600)" />
              </div>
              <p className="text-lg font-extrabold" style={{ color: 'var(--ghrs-purple-600)' }}>
                {member?.longest_streak || 0}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>أطول سلسلة</p>
            </div>
            <div className="p-2">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'var(--ghrs-blue-50)', border: '1px solid var(--ghrs-blue-200)' }}
              >
                <ShieldIcon size={18} color="var(--ghrs-blue-600)" />
              </div>
              <p className="text-lg font-extrabold" style={{ color: 'var(--ghrs-blue-600)' }}>
                {member?.grace_shields || 0}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>الدروع</p>
            </div>
          </div>
        </div>

        {/* All Levels */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1.5px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>
            مراحل النمو
          </h3>
          <div className="space-y-2">
            {LEVELS.map((l) => {
              const isCurrent = l.level === level.level
              const isUnlocked = xp >= l.minXp
              return (
                <div
                  key={l.level}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: isCurrent ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)',
                    border: `1.5px solid ${isCurrent ? 'var(--ghrs-green-300)' : 'transparent'}`,
                    opacity: isUnlocked ? 1 : 0.5,
                  }}
                >
                  <span className="text-2xl flex-shrink-0">{l.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs" style={{ color: 'var(--ghrs-text-primary)' }}>{l.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>{l.minXp} XP</p>
                  </div>
                  {isUnlocked ? (
                    <CheckIcon size={18} color="var(--ghrs-green-600)" />
                  ) : (
                    <LockIcon size={18} color="var(--ghrs-text-tertiary)" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ChildBottomNav />
    </div>
  )
}
