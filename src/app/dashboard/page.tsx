'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState } from '@/components/layout'
import { getCurrentUser, clearAuth, AuthUser } from '@/lib/auth/helper'
import { ChildIcon, TasksIcon, ClockIcon, CopyIcon, GiftsIcon, CoinIcon, TrophyIcon, BookIcon, LeafIcon, GardenIcon, SettingsIcon } from '@/components/icons'

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [family, setFamily] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      const { data: familyData } = await supabase.from('families').select('*').eq('id', user.familyId).single()
      setFamily(familyData)

      const { data: childrenData } = await supabase.from('members').select('*').eq('family_id', user.familyId).eq('role', 'child')
      setChildren(childrenData || [])

      const { data: tasksData } = await supabase.from('tasks').select('*').eq('family_id', user.familyId).eq('is_active', true)
      setTasks(tasksData || [])

      const taskIds = tasksData?.map(t => t.id) || []
      if (taskIds.length > 0) {
        const { data: pendingData } = await supabase.from('task_completions').select('id').is('approved', null).in('task_id', taskIds)
        setPendingApprovals(pendingData?.length || 0)
      }
      setLoading(false)
    }
    getData()

    const channel = supabase.channel('dashboard-completions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => {
        const refresh = async () => {
          const user = await getCurrentUser()
          if (!user) return
          const { data: t } = await supabase.from('tasks').select('id').eq('family_id', user.familyId).eq('is_active', true)
          const ids = t?.map(x => x.id) || []
          if (ids.length > 0) {
            const { data: p } = await supabase.from('task_completions').select('id').is('approved', null).in('task_id', ids)
            setPendingApprovals(p?.length || 0)
          }
        }
        refresh()
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleLogout = async () => {
    clearAuth()
    if (authUser?.via === 'supabase') await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <LeafIcon size={48} color="var(--ghrs-green-500)" className="mx-auto mb-4 ghrs-animate-float" />
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <PageHeader title={`مرحباً ${authUser?.name}`} subtitle={family?.name} />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="ghrs-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)' }}>
                  <ChildIcon size={24} color="var(--ghrs-green-600)" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{children.length}</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>الأبناء</p>
                </div>
              </div>
            </div>

            <div className="ghrs-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)' }}>
                  <TasksIcon size={24} color="var(--ghrs-amber-600)" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{tasks.length}</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>المهام النشطة</p>
                </div>
              </div>
            </div>

            <Link href="/tasks?status=pending" className="ghrs-card p-4 ghrs-card-interactive">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: pendingApprovals > 0 ? 'var(--ghrs-amber-100)' : 'var(--ghrs-blue-50)' }}>
                  <ClockIcon size={24} color={pendingApprovals > 0 ? 'var(--ghrs-amber-600)' : 'var(--ghrs-blue-600)'} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: pendingApprovals > 0 ? 'var(--ghrs-amber-600)' : 'var(--ghrs-blue-600)' }}>{pendingApprovals}</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>بانتظار الموافقة</p>
                </div>
                {pendingApprovals > 0 && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold animate-pulse" style={{ background: 'var(--ghrs-amber-100)', color: 'var(--ghrs-amber-700)' }}>
                    جديد
                  </span>
                )}
              </div>
            </Link>

            <div className="ghrs-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-purple-50)' }}>
                  <CopyIcon size={24} color="var(--ghrs-purple-600)" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono" style={{ color: 'var(--ghrs-purple-600)' }}>{family?.code}</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>كود العائلة</p>
                </div>
              </div>
            </div>
          </div>

          {/* Children Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>أبنائي</h2>
              <Link href="/children" className="text-sm font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>عرض الكل ←</Link>
            </div>
            {children.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {children.slice(0, 4).map(child => (
                  <Link key={child.id} href="/children" className="ghrs-card p-5 ghrs-card-interactive">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)' }}>
                        <LeafIcon size={32} color="var(--ghrs-green-500)" />
                      </div>
                      <p className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{child.name}</p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{child.login_code}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ChildIcon size={48} />} title="لم تتم إضافة أي أطفال بعد" description="أضف أطفالك لبدء مغامرة النمو معاً"
                action={<Link href="/children" className="ghrs-btn-primary">+ أضف أول طفل</Link>} />
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>الوصول السريع</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/tasks" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)' }}>
                    <TasksIcon size={24} color="var(--ghrs-amber-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>إدارة المهام</p>
                </div>
              </Link>

              <Link href="/rewards" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)' }}>
                    <GiftsIcon size={24} color="var(--ghrs-green-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>المكافآت</p>
                </div>
              </Link>

              <Link href="/children" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-blue-50)' }}>
                    <ChildIcon size={24} color="var(--ghrs-blue-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>الأبناء</p>
                </div>
              </Link>

              <Link href="/stories" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-purple-50)' }}>
                    <BookIcon size={24} color="var(--ghrs-purple-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>القصص</p>
                </div>
              </Link>

              <Link href="/reward-bank" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)' }}>
                    <CoinIcon size={24} color="var(--ghrs-amber-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>بنك المكافآت</p>
                </div>
              </Link>

              <Link href="/ledger" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)' }}>
                    <CoinIcon size={24} color="var(--ghrs-green-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>سجل المعاملات</p>
                </div>
              </Link>

              <Link href="/activity" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)' }}>
                    <ClockIcon size={24} color="var(--ghrs-amber-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>سجل النشاط</p>
                </div>
              </Link>

              <Link href="/quran" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)' }}>
                    <BookIcon size={24} color="var(--ghrs-green-600)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>القرآن</p>
                </div>
              </Link>

              <Link href="/settings" className="ghrs-card p-4 ghrs-card-interactive">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-bg-tertiary)' }}>
                    <SettingsIcon size={24} color="var(--ghrs-text-secondary)" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: 'var(--ghrs-text-primary)' }}>الإعدادات</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Logout */}
          <div className="mt-8 text-center">
            <button onClick={handleLogout} className="px-6 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '2px solid var(--ghrs-red-200)' }}>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
