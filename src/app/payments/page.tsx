'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Skeleton } from '@/components/layout'

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getTransactions = async () => {
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
        .select('family_id')
        .eq('id', identity.member_id)
        .single()

      if (!memberData) return

      const { data: membersData } = await supabase
        .from('members')
        .select('id')
        .eq('family_id', memberData.family_id)

      const memberIds = membersData?.map(m => m.id) || []

      const { data: transactionsData } = await supabase
        .from('money_transactions')
        .select('*')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false })

      setTransactions(transactionsData || [])
      setLoading(false)
    }

    getTransactions()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
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
            title="الأموال"
            subtitle="متابعة المعاملات المالية"
            backHref="/dashboard"
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="ghrs-card p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                {transactions.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0)}
              </p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>الأرباح</p>
            </div>
            <div className="ghrs-card p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                {transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)}
              </p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>المعلقة</p>
            </div>
            <div className="ghrs-card p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-red-500)' }}>
                {transactions.filter(t => t.type === 'withdrawn').reduce((sum, t) => sum + t.amount, 0)}
              </p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>المسحوبات</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="ghrs-card p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {tx.type === 'earned' ? '💰' : tx.type === 'withdrawn' ? '💸' : '🔄'}
                    </span>
                    <div>
                      <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{tx.description || tx.source}</h3>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold" style={{ 
                      color: tx.type === 'earned' ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-500)' 
                    }}>
                      {tx.type === 'earned' ? '+' : '-'}{tx.amount}
                    </p>
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: tx.status === 'paid' ? 'var(--ghrs-green-50)' : tx.status === 'pending' ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)',
                        color: tx.status === 'paid' ? 'var(--ghrs-green-700)' : tx.status === 'pending' ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-tertiary)'
                      }}
                    >
                      {tx.status === 'paid' ? 'مدفوع' : tx.status === 'pending' ? 'معلق' : tx.status === 'approved' ? 'معتمد' : 'مرفوض'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {transactions.length === 0 && (
            <EmptyState
              icon="💰"
              title="لا توجد معاملات مالية بعد"
              description="ستظهر المعاملات المالية هنا عندما ينجز الأطفال المهام"
            />
          )}
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
