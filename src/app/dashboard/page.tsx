'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState } from '@/components/layout'
import { getCurrentUser, clearAuth, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { ChildIcon, TasksIcon, ClockIcon, CopyIcon, GiftsIcon, CoinIcon, TrophyIcon, BookIcon, LeafIcon, GardenIcon, SettingsIcon, StarIcon, CheckIcon } from '@/components/icons'

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [family, setFamily] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney } = useFamilyCurrency()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const getData = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      // All family data is read server-side via the authenticated data API
      const response = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) { router.push('/family-login'); return }

      setFamily(result.family)
      setChildren(result.children)
      setTasks(result.tasks)
      setPendingApprovals(result.pendingApprovals)
      setLoading(false)
    }
    getData()

    // Debounced refetch: coalesce rapid realtime events into a single refetch
    const debouncedRefetch = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(async () => {
        const response = await fetch('/api/dashboard/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const result = await response.json()
        if (response.ok && result.success) {
          setTasks(result.tasks)
          setPendingApprovals(result.pendingApprovals)
          setChildren(result.children)
        }
      }, 400)
    }

    const channel = supabase.channel('dashboard-completions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => {
        debouncedRefetch()
      }).subscribe()
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLogout = async () => {
    clearAuth()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <LeafIcon size={40} color="var(--ghrs-green-500)" className="ghrs-animate-float" />
          <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <PageHeader
            title={`مرحباً ${authUser?.name}`}
            subtitle={family?.name}
          />

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="ghrs-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-green-50)' }}>
                  <ChildIcon size={20} color="var(--ghrs-green-600)" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums leading-none" style={{ color: 'var(--ghrs-text-primary)' }}>{children.length}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>الأبناء</p>
                </div>
              </div>
            </div>

            <div className="ghrs-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-amber-50)' }}>
                  <TasksIcon size={20} color="var(--ghrs-amber-600)" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums leading-none" style={{ color: 'var(--ghrs-text-primary)' }}>{tasks.length}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>المهام النشطة</p>
                </div>
              </div>
            </div>

            <Link href="/approvals" className="ghrs-card p-4 ghrs-card-interactive">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: pendingApprovals > 0 ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-secondary)' }}>
                  <ClockIcon size={20} color={pendingApprovals > 0 ? 'var(--ghrs-amber-600)' : 'var(--ghrs-text-tertiary)'} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold tabular-nums leading-none" style={{ color: pendingApprovals > 0 ? 'var(--ghrs-amber-600)' : 'var(--ghrs-text-primary)' }}>{pendingApprovals}</p>
                    {pendingApprovals > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ghrs-badge ghrs-badge-warning">جديد</span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>بانتظار الموافقة</p>
                </div>
              </div>
            </Link>

            <div className="ghrs-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-bg-secondary)' }}>
                  <CopyIcon size={20} color="var(--ghrs-text-secondary)" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold font-mono leading-none truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{family?.code}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>كود العائلة</p>
                </div>
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>أبنائي</h2>
              {children.length > 0 && (
                <Link href="/children" className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>عرض الكل →</Link>
              )}
            </div>
            {children.length > 0 ? (
              <div className="space-y-3">
                {children.slice(0, 4).map(child => (
                  <div key={child.id} className="ghrs-card p-4">
                    {/* Child name + avatar */}
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: 'var(--ghrs-border-default)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-bg-secondary)' }}>
                        <ChildIcon size={20} color="var(--ghrs-green-600)" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{child.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--ghrs-text-tertiary)' }}>{child.login_code}</p>
                      </div>
                    </div>

                    {/* XP + Money */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--ghrs-surface-pending)', border: '1px solid var(--ghrs-amber-200)' }}>
                        <StarIcon size={16} color="var(--ghrs-amber-600)" />
                        <div className="min-w-0">
                          <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>XP</p>
                          <p className="text-sm font-extrabold tabular-nums leading-none" style={{ color: 'var(--ghrs-text-primary)' }}>{child.xp ?? 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--ghrs-surface-success)', border: '1px solid var(--ghrs-green-200)' }}>
                        <CoinIcon size={16} color="var(--ghrs-green-600)" />
                        <div className="min-w-0">
                          <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>د.ب</p>
                          <p className="text-sm font-extrabold tabular-nums leading-none truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{fmtMoney(child.money ?? 0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pending approvals */}
                    {child.pendingApprovals > 0 ? (
                      <Link href="/approvals" className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all" style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}>
                        <div className="flex items-center gap-2">
                          <ClockIcon size={14} color="var(--ghrs-amber-600)" />
                          <span className="text-xs font-bold" style={{ color: 'var(--ghrs-amber-700)' }}>
                            {child.pendingApprovals} {child.pendingApprovals === 1 ? 'طلب بانتظار الموافقة' : child.pendingApprovals === 2 ? 'طلبان بانتظار الموافقة' : 'طلبات بانتظار الموافقة'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--ghrs-text-tertiary)' }}>←</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--ghrs-bg-secondary)', border: '1px solid var(--ghrs-border-default)' }}>
                        <CheckIcon size={14} color="var(--ghrs-text-tertiary)" />
                        <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>لا توجد طلبات معلقة</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ChildIcon size={32} />} title="لم تتم إضافة أي أطفال بعد" description="أضف أطفالك لبدء مغامرة النمو معاً"
                action={<Link href="/children" className="ghrs-btn-primary">+ أضف أول طفل</Link>} />
            )}
          </div>

          {/* Quick actions */}
          <div className="mb-6">
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>الوصول السريع</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <Link href="/tasks" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-amber-50)' }}>
                    <TasksIcon size={20} color="var(--ghrs-amber-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>المهام</p>
                </div>
              </Link>

              <Link href="/rewards" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-green-50)' }}>
                    <GiftsIcon size={20} color="var(--ghrs-green-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>المكافآت</p>
                </div>
              </Link>

              <Link href="/approvals" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-amber-50)' }}>
                    <ClockIcon size={20} color="var(--ghrs-amber-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>الموافقات</p>
                </div>
              </Link>

              <Link href="/ledger" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-green-50)' }}>
                    <CoinIcon size={20} color="var(--ghrs-green-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>المعاملات</p>
                </div>
              </Link>

              <Link href="/activity" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-bg-secondary)' }}>
                    <ClockIcon size={20} color="var(--ghrs-text-secondary)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>النشاط</p>
                </div>
              </Link>

              <Link href="/stories" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-purple-50)' }}>
                    <BookIcon size={20} color="var(--ghrs-purple-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>القصص</p>
                </div>
              </Link>

              <Link href="/reward-bank" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-amber-50)' }}>
                    <GiftsIcon size={20} color="var(--ghrs-amber-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>بنك المكافآت</p>
                </div>
              </Link>

              <Link href="/presets" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-bg-secondary)' }}>
                    <CopyIcon size={20} color="var(--ghrs-text-secondary)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>بنك المهام</p>
                </div>
              </Link>

              <Link href="/achievements" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-amber-50)' }}>
                    <TrophyIcon size={20} color="var(--ghrs-amber-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>الإنجازات</p>
                </div>
              </Link>

              <Link href="/quran" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-green-50)' }}>
                    <BookIcon size={20} color="var(--ghrs-green-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>القرآن</p>
                </div>
              </Link>

              <Link href="/payments" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-green-50)' }}>
                    <CoinIcon size={20} color="var(--ghrs-green-600)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>الأموال</p>
                </div>
              </Link>

              <Link href="/settings" className="ghrs-card p-3 ghrs-card-interactive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-bg-secondary)' }}>
                    <SettingsIcon size={20} color="var(--ghrs-text-secondary)" />
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>الإعدادات</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Logout */}
          <div className="mt-4 flex justify-center">
            <button onClick={handleLogout} className="ghrs-btn-secondary text-ghrs-red-600" style={{ color: 'var(--ghrs-red-600)' }}>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
