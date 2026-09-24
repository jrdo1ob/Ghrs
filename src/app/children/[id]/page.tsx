'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, Skeleton } from '@/components/layout'
import { getCurrentUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { getLevel, getNextLevel, getXpProgress } from '@/lib/gamification'
import AnimatedXPBar from '@/components/AnimatedXPBar'
import AchievementBadge from '@/components/child/AchievementBadge'
import { ChildIcon, StarIcon, CoinIcon, FireIcon, TrophyIcon, ShieldIcon, CheckIcon, LockIcon } from '@/components/icons'

export default function ChildDetailPage() {
  const params = useParams()
  const childId = params.id as string
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()

  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<any>(null)
  const [xp, setXp] = useState(0)
  const [money, setMoney] = useState(0)
  const [xpHistory, setXpHistory] = useState<any[]>([])
  const [taskHistory, setTaskHistory] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [totalAchievements, setTotalAchievements] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    const getData = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }

      const response = await fetch('/api/children/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(result.error || 'حدث خطأ')
        setLoading(false)
        return
      }

      setChild(result.child)
      setXp(result.xp || 0)
      setMoney(result.money || 0)
      setXpHistory(result.xp_history || [])
      setTaskHistory(result.task_history || [])
      setAchievements(result.achievements || [])
      setTotalAchievements(result.total_achievements || 0)
      setLoading(false)
    }
    getData()
  }, [childId, router])

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <PageHeader title="تفاصيل الطفل" backHref="/children" />
            <div className="ghrs-card p-6 text-center">
              <p style={{ color: 'var(--ghrs-red-600)' }}>{error}</p>
              <Link href="/children" className="ghrs-btn-primary inline-block mt-4">العودة للأبناء</Link>
            </div>
          </div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  const level = getLevel(xp)
  const nextLevel = getNextLevel(level)
  const progress = getXpProgress(xp)

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader title={`تفاصيل ${child?.name || 'الطفل'}`} backHref="/children" />

          {/* Child Identity Card */}
          <div className="ghrs-card p-5 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ background: 'var(--ghrs-green-50)' }}>
                {level.emoji}
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{child?.name}</h2>
                <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>
                  المستوى: {level.name} — {level.description}
                </p>
              </div>
            </div>

            {/* XP Progress */}
            <AnimatedXPBar current={progress.percent} max={100} size="md" />
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
              <span>{xp} نقطة</span>
              {nextLevel && <span>{nextLevel.minXp} نقطة للمستوى التالي</span>}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="ghrs-card p-4 text-center">
              <StarIcon size={24} color="var(--ghrs-amber-500)" className="mx-auto mb-1" />
              <p className="text-xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{xp}</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>نقاط الخبرة</p>
            </div>
            <div className="ghrs-card p-4 text-center">
              <CoinIcon size={24} color="var(--ghrs-amber-600)" className="mx-auto mb-1" />
              <p className="text-xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{fmtMoney(money)}</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>الرصيد</p>
            </div>
            <div className="ghrs-card p-4 text-center">
              <FireIcon size={24} color="var(--ghrs-red-500)" className="mx-auto mb-1" />
              <p className="text-xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{child?.current_streak || 0}</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>السلسلة الحالية</p>
            </div>
            <div className="ghrs-card p-4 text-center">
              <TrophyIcon size={24} color="var(--ghrs-green-500)" className="mx-auto mb-1" />
              <p className="text-xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{child?.longest_streak || 0}</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>أطول سلسلة</p>
            </div>
          </div>

          {/* Grace Shields */}
          {child?.grace_shields > 0 && (
            <div className="ghrs-card p-4 mb-4 flex items-center gap-3">
              <ShieldIcon size={20} color="var(--ghrs-blue-500)" />
              <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-primary)' }}>
                {child.grace_shields} دروع حماية متبقية
              </span>
            </div>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>
                الإنجازات ({achievements.length}/{totalAchievements})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {achievements.map((a: any) => (
                  <AchievementBadge
                    key={a.id}
                    title={a.title || 'إنجاز'}
                    description={a.description || ''}
                    icon={a.icon}
                    unlocked={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Task History */}
          {taskHistory.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>
                آخر المهام المنجزة
              </h3>
              <div className="space-y-2">
                {taskHistory.map((t: any) => (
                  <div key={t.id} className="ghrs-card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckIcon size={16} color={t.approved ? 'var(--ghrs-green-500)' : 'var(--ghrs-text-tertiary)'} />
                      <span className="text-sm truncate" style={{ color: 'var(--ghrs-text-primary)' }}>
                        {t.task_title}
                      </span>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: t.approved ? 'var(--ghrs-green-600)' : 'var(--ghrs-amber-500)' }}>
                      {t.approved ? '✓ معتمدة' : '⏳ معلقة'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* XP History */}
          {xpHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>
                سجل النقاط
              </h3>
              <div className="space-y-2">
                {xpHistory.slice(0, 10).map((t: any, i: number) => (
                  <div key={i} className="ghrs-card p-3 flex items-center justify-between">
                    <span className="text-sm truncate" style={{ color: 'var(--ghrs-text-primary)' }}>
                      {t.description || t.source}
                    </span>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: t.amount > 0 ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-600)' }}>
                      {t.amount > 0 ? '+' : ''}{t.amount} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
