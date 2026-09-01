'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChildBottomNav } from '@/components/layout'
import { LEVELS, getLevel, getNextLevel, Level } from '@/lib/gamification'
import { GardenIcon, PartyIcon, TrophyIcon, ShieldIcon, CheckIcon, LockIcon, LeafIcon, FireIcon, WaterIcon, SparkleIcon } from '@/components/icons'

export default function ChildGardenPage() {
  const [xp, setXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const childId = localStorage.getItem('child_id')
      if (!childId) {
        router.push('/family-login')
        return
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', childId)
        .single()

      if (!memberData || memberData.role !== 'child') {
        router.push('/family-login')
        return
      }

      setMember(memberData)

      const { data: xpData } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('member_id', childId)

      const totalXp = xpData?.reduce((sum, t) => sum + t.amount, 0) || 0
      setXp(totalXp)
      setLoading(false)
    }

    getData()
  }, [])

  const level = getLevel(xp)
  const nextLevel = getNextLevel(level)
  const progressToNext = nextLevel
    ? ((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100
    : 100

  // isThirsty: no completion in 2+ days
  const today = new Date().toISOString().split('T')[0]
  const lastActive = member?.last_active_date
  const isThirsty = lastActive && lastActive < today && 
    (new Date().getTime() - new Date(lastActive).getTime()) > 86400000

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce"><LeafIcon size={48} /></div>
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري تحميل حديقتك...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--ghrs-text-primary)' }}><GardenIcon size={24} className="inline" /> حديقتي</h1>

        {/* Garden Display */}
        <div className="ghrs-card p-8 mb-6 text-center relative overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${level.soilColor} 100%)`
            }}
          />

          {/* Sky */}
          <div className="relative">
            {/* Sun */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-30"><SparkleIcon size={48} className="text-amber-400" /></div>

            {/* Thirsty indicator */}
            {isThirsty && (
              <div className="absolute top-2 right-2 animate-bounce" title="حديقتك تنتظر الماء!"><WaterIcon size={24} /></div>
            )}

            {/* Plant */}
            <div className={`relative mt-12 mb-6 ${level.plantSize} ${isThirsty ? 'opacity-50 grayscale' : 'ghrs-animate-pulse'}`}>
              {level.emoji}
            </div>

            {/* Thirsty message */}
            {isThirsty && (
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--ghrs-blue-600)' }}>
                <WaterIcon size={14} className="inline" /> حديقتك تنتظر الماء! أنجز مهمة لسقايتها
              </p>
            )}

            {/* Soil */}
            <div className="relative h-8 rounded-b-2xl" style={{ background: `linear-gradient(to top, ${level.soilColor}, ${level.soilColor}dd)` }}>
              <div className="absolute top-0 left-0 right-0 h-1 opacity-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
            </div>

            {/* Clouds */}
            <div className="absolute top-4 right-4 opacity-20"><SparkleIcon size={24} /></div>
            <div className="absolute top-8 left-6 opacity-20"><SparkleIcon size={16} /></div>
          </div>
        </div>

        {/* Level Info */}
        <div className="ghrs-card p-6 mb-6 text-center">
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
        <div className="ghrs-card p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}><FireIcon size={24} className="inline" /> {member?.current_streak || 0}</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>السلسلة الحالية</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-purple-600)' }}><TrophyIcon size={24} className="inline" /> {member?.longest_streak || 0}</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>أطول سلسلة</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-blue-600)' }}><ShieldIcon size={24} className="inline" /> {member?.grace_shields || 0}</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>دروع الحماية</p>
            </div>
          </div>
        </div>

        {/* All Levels */}
        <div className="ghrs-card p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>مراحل النمو</h3>
          <div className="space-y-3">
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
                  {isUnlocked && <CheckIcon size={20} />}
                  {!isUnlocked && <LockIcon size={20} />}
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
