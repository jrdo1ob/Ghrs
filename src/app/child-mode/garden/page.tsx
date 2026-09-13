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
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-extrabold mb-6 text-center" style={{ color: 'var(--ghrs-text-primary)' }}>
          <GardenIcon size={24} className="inline" /> حديقتي
        </h1>

        {/* Garden Display */}
        <div className="mb-6 text-center relative overflow-hidden rounded-3xl p-10" style={{ background: `linear-gradient(180deg, var(--ghrs-green-50) 0%, var(--ghrs-bg-card) 60%, ${level.soilColor}22 100%)`, border: '1.5px solid var(--ghrs-green-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {/* Decorative elements */}
          <div className="absolute top-4 right-6 opacity-15"><SparkleIcon size={20} /></div>
          <div className="absolute top-8 left-8 opacity-10"><SparkleIcon size={14} /></div>
          <div className="absolute top-3 left-1/4 opacity-10"><SparkleIcon size={12} /></div>

          <div className="relative">
            {/* Thirsty indicator */}
            {isThirsty && (
              <div className="absolute -top-2 right-4 ghrs-animate-bounce" title="حديقتك تنتظر الماء!">
                <WaterIcon size={28} />
              </div>
            )}

            {/* Plant with subtle shadow */}
            <div className={`relative mb-6 ${level.plantSize} transition-all duration-700`} style={{ filter: isThirsty ? 'opacity(0.5) grayscale(1)' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
              {level.emoji}
            </div>

            {/* Thirsty message */}
            {isThirsty && (
              <p className="text-xs font-bold mb-3" style={{ color: 'var(--ghrs-blue-600)' }}>
                <WaterIcon size={14} className="inline" /> حديقتك تنتظر الماء! أنجز مهمة لسقايتها
              </p>
            )}

            {/* Soil */}
            <div className="relative h-6 rounded-b-2xl" style={{ background: `linear-gradient(to top, ${level.soilColor}, ${level.soilColor}cc)` }}>
              <div className="absolute top-0 left-0 right-0 h-0.5 opacity-25" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />
            </div>
          </div>
        </div>

        {/* Level Info */}
        <div className="rounded-3xl p-6 mb-6 text-center" style={{ background: 'var(--ghrs-bg-card)', border: '1.5px solid var(--ghrs-border-default)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="text-4xl mb-3">{level.emoji}</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ghrs-text-primary)' }}>المستوى {level.level}: {level.name}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>{level.description}</p>

          {nextLevel && (
            <>
              <div className="ghrs-progress-bar mb-2">
                <div
                  className="ghrs-progress-fill"
                  style={{ width: `${Math.min(100, progressToNext)}%` }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                {xp} / {nextLevel.minXp} XP للمستوى التالي
              </p>
            </>
          )}

          {!nextLevel && (
            <p className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
              <PartyIcon size={20} className="inline" /> وصلت لأعلى مستوى! أنت حديقة مزهرة!
            </p>
          )}
        </div>

        {/* Streak & Shields Info */}
        <div className="rounded-3xl p-5 mb-6" style={{ background: 'var(--ghrs-bg-card)', border: '1.5px solid var(--ghrs-border-default)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)' }}>
                <FireIcon size={20} color="var(--ghrs-amber-600)" />
              </div>
              <p className="text-xl font-extrabold" style={{ color: 'var(--ghrs-amber-600)' }}>{member?.current_streak || 0}</p>
              <p className="text-[10px]" style={{ color: 'var(--ghrs-text-secondary)' }}>السلسلة الحالية</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-purple-50)' }}>
                <TrophyIcon size={20} color="var(--ghrs-purple-600)" />
              </div>
              <p className="text-xl font-extrabold" style={{ color: 'var(--ghrs-purple-600)' }}>{member?.longest_streak || 0}</p>
              <p className="text-[10px]" style={{ color: 'var(--ghrs-text-secondary)' }}>أطول سلسلة</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-blue-50)' }}>
                <ShieldIcon size={20} color="var(--ghrs-blue-600)" />
              </div>
              <p className="text-xl font-extrabold" style={{ color: 'var(--ghrs-blue-600)' }}>{member?.grace_shields || 0}</p>
              <p className="text-[10px]" style={{ color: 'var(--ghrs-text-secondary)' }}>دروع الحماية</p>
            </div>
          </div>
        </div>

        {/* All Levels */}
        <div className="rounded-3xl p-5" style={{ background: 'var(--ghrs-bg-card)', border: '1.5px solid var(--ghrs-border-default)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 className="text-base font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>مراحل النمو</h3>
          <div className="space-y-2.5">
            {LEVELS.map((l) => {
              const isCurrent = l.level === level.level
              const isUnlocked = xp >= l.minXp
              return (
                <div
                  key={l.level}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: isCurrent ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)',
                    border: `2px solid ${isCurrent ? 'var(--ghrs-green-400)' : 'transparent'}`,
                    opacity: isUnlocked ? 1 : 0.5
                  }}
                >
                  <span className="text-3xl">{l.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>{l.name}</p>
                    <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{l.minXp} XP</p>
                  </div>
                  {isUnlocked ? <CheckIcon size={20} /> : <LockIcon size={20} />}
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
