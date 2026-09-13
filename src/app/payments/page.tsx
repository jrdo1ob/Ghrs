'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Skeleton } from '@/components/layout'
import { getCurrentUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { CoinIcon } from '@/components/icons'

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney } = useFamilyCurrency()

  useEffect(() => {
    const getTransactions = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/owner-login')
        return
      }

      // Family-wide money transactions are resolved server-side
      const response = await fetch('/api/payments/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) return

      setTransactions(result.transactions)
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
                {fmtMoney(transactions.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0))}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>الأرباح</p>
            </div>
            <div className="ghrs-card p-4 text-center">
              <p className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: 'var(--ghrs-text-primary)' }}>
                {fmtMoney(transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0))}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>المعلقة</p>
            </div>
            <div className="ghrs-card p-4 text-center">
              <p className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: 'var(--ghrs-text-primary)' }}>
                {fmtMoney(transactions.filter(t => t.type === 'withdrawn').reduce((sum, t) => sum + t.amount, 0))}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>المسحوبات</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2.5">
            {transactions.map((tx) => (
              <div key={tx.id} className="ghrs-card p-3.5">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: tx.type === 'earned' ? 'var(--ghrs-surface-success)' : 'var(--ghrs-surface-pending)', border: `1px solid ${tx.type === 'earned' ? 'var(--ghrs-green-200)' : 'var(--ghrs-amber-200)'}` }}>
                      <CoinIcon size={16} color={tx.type === 'earned' ? 'var(--ghrs-green-600)' : 'var(--ghrs-amber-600)'} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{tx.description || tx.source}</h3>
                      <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-base font-extrabold tabular-nums leading-none" style={{
                      color: tx.type === 'earned' ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-600)'
                    }}>
                      {tx.type === 'earned' ? '+' : '-'}{fmtMoney(tx.amount)}
                    </p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ghrs-badge ${
                      tx.status === 'paid' ? 'ghrs-badge-success'
                      : tx.status === 'pending' ? 'ghrs-badge-warning'
                      : tx.status === 'approved' ? 'ghrs-badge-info'
                      : 'ghrs-badge-error'
                    }`}>
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
              icon={<CoinIcon size={32} />}
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
