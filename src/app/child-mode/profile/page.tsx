'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChildBottomNav } from '@/components/layout'
import { LEVELS, getLevel, getNextLevel, Level } from '@/lib/gamification'
import ThemeToggle from '@/components/child/ThemeToggle'
import ChildLoading from '@/components/child/ChildLoading'
import AchievementBadge from '@/components/child/AchievementBadge'
import { StarIcon, FireIcon, CheckIcon, TasksIcon, TrophyIcon, SparkleIcon, CoinIcon } from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

export default function ChildProfilePage() {
  const [member, setMember] = useState<any>(null)
  const [xp, setXp] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
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
        body: JSON.stringify({ section: 'profile' }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        router.push('/family-login')
        return
      }

      setMember(result.member)
      setXp(result.xp)
      setTotalTasks(result.total_tasks)
      setCompletedTasks(result.completed_tasks)
      setStreak(result.member.current_streak || 0)
      setLoading(false)
    }

    getData()
  }, [])

  const level = getLevel(xp)
  const nextLevel = getNextLevel(level)
  const progressToNext = nextLevel
    ? Math.min(100, ((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)
    : 100

  const handleLogout = () => {
    localStorage.removeItem('child_id')
    localStorage.removeItem('family_id')
    router.push('/family-login')
  }

  if (loading) {
    return <ChildLoading text="جاري تحميل الملف..." icon="👤" />
  }

  // Achievement calculations (all existing logic preserved)
  const achievements = [
    {
      title: 'جامع النقاط',
      description: 'اجمع 500 نقطة خبرة',
      icon: '⭐',
      unlocked: xp >= 500,
      progress: { current: xp, max: 500 },
    },
    {
      title: 'المهام النشطة',
      description: 'أكمل 10 مهام',
      icon: '📋',
      unlocked: completedTasks >= 10,
      progress: { current: completedTasks, max: 10 },
    },
    {
      title: 'محارب الإنجاز',
      description: 'حافظ على سلسلة 7 أيام',
      icon: '🔥',
      unlocked: streak >= 7,
      progress: { current: streak, max: 7 },
    },
    {
      title: 'المستوى العالي',
      description: 'وصّل إلى المستوى 4',
      icon: '🌳',
      unlocked: level.level >= 4,
      progress: { current: level.level, max: 4 },
    },
    {
      title: 'حديقة كاملة',
      description: 'اصل إلى أعلى مستوى',
      icon: '🏡',
      unlocked: level.level >= 6,
      progress: { current: level.level, max: 6 },
    },
    {
      title: 'درع الحماية',
      description: 'احصل على 3 دروع حماية',
      icon: '🛡️',
      unlocked: (member?.grace_shields || 0) >= 3,
      progress: { current: member?.grace_shields || 0, max: 3 },
    },
  ]

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalAchievements = achievements.length

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        <div className="flex justify-end mb-3">
          <ThemeToggle />
        </div>

        {/* === SECTION 1: Profile Header === */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{level.emoji}</span>
            <div>
              <h1 className="text-xl font-extrabold" style={{ color: 'var(--ghrs-text-primary)' }}>
                {member?.name}
              </h1>
              <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
                المستوى {level.level}: {level.name}
              </p>
            </div>
          </div>
        </div>

        {/* === SECTION 2: Achievements (Primary) === */}
        <div
          className="mb-5 rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(170deg, var(--ghrs-amber-50) 0%, var(--ghrs-bg-card) 70%)',
            border: '1.5px solid var(--ghrs-amber-200)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          <div className="absolute top-3 right-5 opacity-10">
            <SparkleIcon size={18} />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrophyIcon size={18} color="var(--ghrs-amber-600)" />
                <h2 className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>إنجازاتي</h2>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--ghrs-amber-100)', color: 'var(--ghrs-amber-700)' }}>
                {unlockedCount}/{totalAchievements}
              </span>
            </div>

            <div className="space-y-2">
              {achievements.map((achievement, i) => (
                <AchievementBadge
                  key={i}
                  title={achievement.title}
                  description={achievement.description}
                  icon={achievement.icon}
                  unlocked={achievement.unlocked}
                  progress={achievement.progress}
                />
              ))}
            </div>
          </div>
        </div>

        {/* === SECTION 3: Level / Growth === */}
        <div
          className="mb-5 rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(170deg, var(--ghrs-green-50) 0%, var(--ghrs-bg-card) 70%)',
            border: '1.5px solid var(--ghrs-green-200)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          <div className="absolute top-3 right-5 opacity-10">
            <SparkleIcon size={18} />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{level.emoji}</span>
              <h2 className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>نمو حديقتي</h2>
            </div>

            {/* Current → Next */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{level.emoji}</span>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>مستواك الآن</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{level.name}</p>
                </div>
              </div>

              {nextLevel && (
                <div className="flex items-center gap-2 text-left">
                  <div className="text-left">
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>هدفك القادم</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{nextLevel.name}</p>
                  </div>
                  <span className="text-xl">{nextLevel.emoji}</span>
                </div>
              )}
            </div>

            {/* XP Progress */}
            {nextLevel ? (
              <>
                <div className="ghrs-garden-xp-bar mb-2">
                  <div className="ghrs-garden-xp-fill" style={{ width: `${progressToNext}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
                    ⭐ {xp} / {nextLevel.minXp} XP
                  </p>
                  <p className="text-[11px] font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                    باقي {nextLevel.minXp - xp} XP
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-1">
                <p className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                  🎉 وصلت لأعلى مستوى!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* === SECTION 4: Stats (Compact) === */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div
            className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}
            >
              <StarIcon size={16} color="var(--ghrs-amber-600)" />
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>XP</p>
            </div>
          </div>

          <div
            className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}
            >
              <FireIcon size={16} color="var(--ghrs-amber-600)" />
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--ghrs-amber-600)' }}>{streak}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>أيام متتالية</p>
            </div>
          </div>

          <div
            className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}
            >
              <CheckIcon size={16} color="var(--ghrs-green-600)" />
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--ghrs-green-600)' }}>{completedTasks}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>مهام مكتملة</p>
            </div>
          </div>

          <div
            className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ghrs-blue-50)', border: '1px solid var(--ghrs-blue-200)' }}
            >
              <TasksIcon size={16} color="var(--ghrs-blue-600)" />
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--ghrs-blue-600)' }}>{totalTasks}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>مهام نشطة</p>
            </div>
          </div>
        </div>

        {/* === Logout === */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-6 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
          style={{
            background: 'var(--ghrs-bg-secondary)',
            color: 'var(--ghrs-text-tertiary)',
            border: '1.5px solid var(--ghrs-border-default)',
          }}
        >
          خروج من الحساب
        </button>
      </div>

      <ChildBottomNav />
    </div>
  )
}
