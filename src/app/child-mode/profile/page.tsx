'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, Toast } from '@/components/layout'
import { LEVELS, getLevel, Level } from '@/lib/gamification'
import ThemeToggle from '@/components/child/ThemeToggle'
import ChildLoading from '@/components/child/ChildLoading'
import AchievementBadge from '@/components/child/AchievementBadge'
import { StarIcon, FireIcon, CheckIcon, TasksIcon, TrophyIcon } from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

export default function ChildProfilePage() {
  const [member, setMember] = useState<any>(null)
  const [xp, setXp] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
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

  const handleLogout = () => {
    localStorage.removeItem('child_id')
    localStorage.removeItem('family_id')
    router.push('/family-login')
  }

  if (loading) {
    return <ChildLoading text="جاري تحميل الملف..." icon="👤" />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        <div className="flex justify-end mb-3">
          <ThemeToggle />
        </div>

        {/* Profile Header */}
        <div
          className="rounded-3xl p-6 mb-5 text-center"
          style={{
            background: 'linear-gradient(170deg, var(--ghrs-green-50) 0%, var(--ghrs-bg-card) 70%)',
            border: '1.5px solid var(--ghrs-green-200)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          <div className="text-5xl mb-3">{level.emoji}</div>
          <h1 className="text-xl font-extrabold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>
            {member?.name}
          </h1>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mt-1"
            style={{
              background: 'var(--ghrs-green-100)',
              border: '1.5px solid var(--ghrs-green-200)',
            }}
          >
            <span className="text-base">{level.emoji}</span>
            <span className="font-bold text-xs" style={{ color: 'var(--ghrs-green-700)' }}>
              المستوى {level.level}: {level.name}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}
            >
              <StarIcon size={18} color="var(--ghrs-amber-600)" />
            </div>
            <p className="text-xl font-extrabold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>XP</p>
          </div>

          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'var(--ghrs-red-50)', border: '1px solid var(--ghrs-red-200)' }}
            >
              <FireIcon size={18} color="var(--ghrs-red-500)" />
            </div>
            <p className="text-xl font-extrabold" style={{ color: 'var(--ghrs-red-500)' }}>{streak}</p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>أيام متتالية</p>
          </div>

          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}
            >
              <CheckIcon size={18} color="var(--ghrs-green-600)" />
            </div>
            <p className="text-xl font-extrabold" style={{ color: 'var(--ghrs-green-600)' }}>{completedTasks}</p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>مهام مكتملة</p>
          </div>

          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'var(--ghrs-blue-50)', border: '1px solid var(--ghrs-blue-200)' }}
            >
              <TasksIcon size={18} color="var(--ghrs-blue-600)" />
            </div>
            <p className="text-xl font-extrabold" style={{ color: 'var(--ghrs-blue-600)' }}>{totalTasks}</p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>مهام نشطة</p>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ghrs-text-primary)' }}>
            <TrophyIcon size={16} color="var(--ghrs-amber-600)" /> إنجازاتي
          </h3>
          <div className="space-y-2">
            <AchievementBadge
              title="جامع النقاط"
              description="اجمع 500 نقطة خبرة"
              icon="⭐"
              unlocked={xp >= 500}
              progress={{ current: xp, max: 500 }}
            />
            <AchievementBadge
              title="المهام النشطة"
              description="أكمل 10 مهام"
              icon="📋"
              unlocked={completedTasks >= 10}
              progress={{ current: completedTasks, max: 10 }}
            />
            <AchievementBadge
              title="محارب الإنجاز"
              description="حافظ على سلسلة 7 أيام"
              icon="🔥"
              unlocked={streak >= 7}
              progress={{ current: streak, max: 7 }}
            />
            <AchievementBadge
              title="المستوى العالي"
              description="وصّل إلى المستوى 4"
              icon="🌳"
              unlocked={level.level >= 4}
              progress={{ current: level.level, max: 4 }}
            />
            <AchievementBadge
              title="حديقة كاملة"
              description="اصل إلى أعلى مستوى"
              icon="🏡"
              unlocked={level.level >= 6}
              progress={{ current: level.level, max: 6 }}
            />
            <AchievementBadge
              title="درع الحماية"
              description="احصل على 3 دروع حماية"
              icon="🛡️"
              unlocked={(member?.grace_shields || 0) >= 3}
              progress={{ current: member?.grace_shields || 0, max: 3 }}
            />
          </div>
        </div>

        {/* Logout */}
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
