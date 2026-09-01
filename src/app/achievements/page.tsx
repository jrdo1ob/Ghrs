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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/owner-login')
        return
      }

      const { data: identity } = await supabase
        .from('auth_identities')
        .select('member_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!identity) {
        router.push('/family-setup')
        return
      }

      const { data: achievementsData } = await supabase
        .from('achievement_definitions')
        .select('*')

      setAchievements(achievementsData || [])

      const { data: memberAchievementsData } = await supabase
        .from('member_achievements')
        .select('*')
        .eq('member_id', identity.member_id)

      setMemberAchievements(memberAchievementsData || [])
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
          <div className="ghrs-card p-5 mb-6 text-center">
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                  {memberAchievements.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>إنجازات مكتسبة</p>
              </div>
              <div className="w-px h-12" style={{ background: 'var(--ghrs-border-default)' }} />
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                  {achievements.length - memberAchievements.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>إنجازات متبقية</p>
              </div>
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((achievement) => {
              const earned = memberAchievements.some(ma => ma.achievement_id === achievement.id)
              return (
                <div 
                  key={achievement.id} 
                  className="ghrs-card p-5 text-center transition-all"
                  style={{ 
                    opacity: earned ? 1 : 0.6,
                    border: earned ? '2px solid var(--ghrs-amber-400)' : '1px solid var(--ghrs-border-default)'
                  }}
                >
                  <div className="text-4xl mb-3">{achievement.icon}</div>
                  <h3 className="font-bold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>{achievement.title}</h3>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>{achievement.description}</p>
                  {earned && (
                    <span 
                      className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)' }}
                    >
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
