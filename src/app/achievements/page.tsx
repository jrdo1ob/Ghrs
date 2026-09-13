'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Skeleton } from '@/components/layout'

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([])
  const [memberAchievements, setMemberAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      // Global reference data — still safe to read directly
      const { data: achievementsData } = await supabase
        .from('achievement_definitions')
        .select('*')

      setAchievements(achievementsData || [])

      // Viewer's own achievements are resolved server-side (member-scoped)
      const response = await fetch('/api/achievements/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) { router.push('/owner-login'); return }

      setMemberAchievements(result.member_achievements)
      setLoading(false)
    }

    getData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <ParentSidebar />

      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader 
            title="الإنجازات"
            subtitle="شاهد إنجازاتك وانجازات أطفالك"
            backHref="/dashboard"
          />

          {/* Stats */}
          <div className="ghrs-card p-4 mb-5">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: 'var(--ghrs-text-primary)' }}>
                  {memberAchievements.length}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>مكتسبة</p>
              </div>
              <div className="w-px h-8" style={{ background: 'var(--ghrs-border-default)' }} />
              <div className="text-center">
                <p className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: 'var(--ghrs-text-primary)' }}>
                  {achievements.length - memberAchievements.length}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>متبقية</p>
              </div>
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map((achievement) => {
              const earned = memberAchievements.some(ma => ma.achievement_id === achievement.id)
              return (
                <div
                  key={achievement.id}
                  className="ghrs-card p-4 text-center transition-all"
                  style={{
                    opacity: earned ? 1 : 0.55,
                    border: `1px solid ${earned ? 'var(--ghrs-amber-300)' : 'var(--ghrs-border-default)'}`,
                  }}
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center text-2xl" style={{ background: earned ? 'var(--ghrs-surface-pending)' : 'var(--ghrs-bg-secondary)' }}>
                    {achievement.icon}
                  </div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>{achievement.title}</h3>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>{achievement.description}</p>
                  {earned && (
                    <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-bold ghrs-badge ghrs-badge-success">
                      ✓ مكتسب
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Empty State */}
          {achievements.length === 0 && (
            <EmptyState
              icon="🏆"
              title="لا توجد إنجازات بعد"
              description="ستظهر الإنجازات هنا عندما ينجز الأطفال المهام"
            />
          )}
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
