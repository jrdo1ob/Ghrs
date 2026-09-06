'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChildBottomNav } from '@/components/layout'
import { LEVELS, getLevel, Level } from '@/lib/gamification'
import { StarIcon, FireIcon, CheckIcon, TasksIcon, LeafIcon } from '@/components/icons'
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
      // Get authenticated user from secure session
      const authUser = await getCurrentUser()
      if (!authUser || authUser.role !== 'child') {
        router.push('/family-login')
        return
      }

      // Profile data is resolved server-side, scoped to the session member
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
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">👤</div>
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري تحميل الملف...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
              document.documentElement.setAttribute('data-theme', newTheme)
              localStorage.setItem('ghrs-theme', newTheme)
            }}
            className="p-3 rounded-xl transition-all"
            style={{ background: 'var(--ghrs-bg-card)', border: '2px solid var(--ghrs-border-default)' }}
            aria-label="تبديل المظهر"
          >
            {document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Profile Header */}
        <div className="ghrs-card p-6 mb-6 text-center">
          <div className="text-6xl mb-3">{level.emoji}</div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>{member?.name}</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mt-2" style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}>
            <span className="text-lg">{level.emoji}</span>
            <span className="font-bold text-sm" style={{ color: 'var(--ghrs-green-700)' }}>المستوى {level.level}: {level.name}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="ghrs-card p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)' }}>
              <StarIcon size={24} color="var(--ghrs-amber-600)" />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>نقاط الخبرة</p>
          </div>
          <div className="ghrs-card p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-red-50)' }}>
              <FireIcon size={24} color="var(--ghrs-red-500)" />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-red-500)' }}>{streak}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>أيام متتالية</p>
          </div>
          <div className="ghrs-card p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)' }}>
              <CheckIcon size={24} color="var(--ghrs-green-600)" />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{completedTasks}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>مهام مكتملة</p>
          </div>
          <div className="ghrs-card p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-blue-50)' }}>
              <TasksIcon size={24} color="var(--ghrs-blue-600)" />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-blue-600)' }}>{totalTasks}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>مهام نشطة</p>
          </div>
        </div>

        {/* Info */}
        <div className="ghrs-card p-6 mb-6">
          <h3 className="font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>معلوماتي</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--ghrs-border-default)' }}>
              <span style={{ color: 'var(--ghrs-text-secondary)' }}>الاسم</span>
              <span className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{member?.name}</span>
            </div>
            <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--ghrs-border-default)' }}>
              <span style={{ color: 'var(--ghrs-text-secondary)' }}>كود الدخول</span>
              <span className="font-bold font-mono" style={{ color: 'var(--ghrs-green-600)' }}>{member?.login_code}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span style={{ color: 'var(--ghrs-text-secondary)' }}>المستوى</span>
              <span className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{level.name} {level.emoji}</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-6 rounded-xl font-bold transition-colors"
          style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}
        >
          🚪 خروج من الحساب
        </button>
      </div>

      <ChildBottomNav />
    </div>
  )
}
