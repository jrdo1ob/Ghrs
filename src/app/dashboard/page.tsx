'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, CardSkeleton, EmptyState } from '@/components/layout'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [family, setFamily] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)
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

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', identity.member_id)
        .single()

      if (!memberData) {
        router.push('/family-setup')
        return
      }

      setMember(memberData)

      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('id', memberData.family_id)
        .single()

      setFamily(familyData)

      const { data: childrenData } = await supabase
        .from('members')
        .select('*')
        .eq('family_id', memberData.family_id)
        .eq('role', 'child')

      setChildren(childrenData || [])

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', memberData.family_id)
        .eq('is_active', true)

      setTasks(tasksData || [])

      // Get pending approvals count
      const { data: pendingData } = await supabase
        .from('task_completions')
        .select('id')
        .eq('approved', false)

      setPendingApprovals(pendingData?.length || 0)

      setUser(user)
      setLoading(false)
    }

    getData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🌱</div>
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {/* Desktop Sidebar */}
      <ParentSidebar />

      {/* Main Content */}
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <PageHeader 
            title={`مرحباً ${member?.name} 👋`}
            subtitle={family?.name}
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="ghrs-card p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👶</span>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{children.length}</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>الأبناء</p>
                </div>
              </div>
            </div>

            <div className="ghrs-card p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{tasks.length}</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>المهام النشطة</p>
                </div>
              </div>
            </div>

            <div className="ghrs-card p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⏳</span>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-blue-600)' }}>{pendingApprovals}</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>بانتظار الموافقة</p>
                </div>
              </div>
            </div>

            <div className="ghrs-card p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔑</span>
                <div>
                  <p className="text-lg font-bold font-mono" style={{ color: 'var(--ghrs-green-600)' }}>{family?.code}</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>كود العائلة</p>
                </div>
              </div>
            </div>
          </div>

          {/* Children Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>أبنائي</h2>
              <Link href="/children" className="text-sm font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                عرض الكل →
              </Link>
            </div>

            {children.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {children.slice(0, 4).map((child) => (
                  <Link key={child.id} href="/children" className="ghrs-card p-5 ghrs-card-interactive">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🌱</div>
                      <p className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{child.name}</p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{child.login_code}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="👶"
                title="لم تتم إضافة أي أطفال بعد"
                description="أضف أطفالك لبدء مغامرة النمو معاً"
                action={
                  <Link href="/children" className="ghrs-btn-primary">
                    + أضف أول طفل
                  </Link>
                }
              />
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>الوصول السريع</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/tasks" className="ghrs-card p-5 ghrs-card-interactive">
                <div className="text-center">
                  <span className="text-3xl">📋</span>
                  <p className="font-bold mt-2" style={{ color: 'var(--ghrs-text-primary)' }}>إدارة المهام</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>إنشاء وتعديل المهام</p>
                </div>
              </Link>

              <Link href="/rewards" className="ghrs-card p-5 ghrs-card-interactive">
                <div className="text-center">
                  <span className="text-3xl">🎁</span>
                  <p className="font-bold mt-2" style={{ color: 'var(--ghrs-text-primary)' }}>المكافآت</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>إدارة الهدايا</p>
                </div>
              </Link>

              <Link href="/payments" className="ghrs-card p-5 ghrs-card-interactive">
                <div className="text-center">
                  <span className="text-3xl">💰</span>
                  <p className="font-bold mt-2" style={{ color: 'var(--ghrs-text-primary)' }}>الأموال</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>متابعة المعاملات</p>
                </div>
              </Link>

              <Link href="/achievements" className="ghrs-card p-5 ghrs-card-interactive">
                <div className="text-center">
                  <span className="text-3xl">🏆</span>
                  <p className="font-bold mt-2" style={{ color: 'var(--ghrs-text-primary)' }}>الإنجازات</p>
                  <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>ال achievements</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <ParentBottomNav />
    </div>
  )
}
