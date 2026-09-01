'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { ChildIcon, StarIcon, CoinIcon, LeafIcon, CrownIcon, MotherIcon } from '@/components/icons'

interface Transaction {
  id: string
  member_id: string
  amount: number
  source: string
  description: string | null
  created_at: string
  type?: string
  status?: string
}

export default function LedgerPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [xpTransactions, setXpTransactions] = useState<Transaction[]>([])
  const [moneyTransactions, setMoneyTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'xp' | 'money'>('xp')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney, symbol: currencySymbol } = useFamilyCurrency()

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      const { data: childrenData } = await supabase
        .from('members').select('id, name, role').eq('family_id', user.familyId).order('created_at')
      setChildren(childrenData || [])

      await loadData(user.familyId, 'all')
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async (familyId: string, childId: string) => {
    let childIds: string[] = []
    if (childId === 'all') {
      const { data } = await supabase.from('members').select('id').eq('family_id', familyId).eq('role', 'child')
      childIds = (data || []).map(c => c.id)
    } else {
      childIds = [childId]
    }

    if (childIds.length === 0) { setXpTransactions([]); setMoneyTransactions([]); return }

    const { data: xpData } = await supabase
      .from('xp_transactions').select('*')
      .in('member_id', childIds)
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: moneyData } = await supabase
      .from('money_transactions').select('*')
      .in('member_id', childIds)
      .order('created_at', { ascending: false })
      .limit(100)

    setXpTransactions(xpData || [])
    setMoneyTransactions(moneyData || [])
  }

  const handleChildChange = async (childId: string) => {
    setSelectedChild(childId)
    if (authUser) await loadData(authUser.familyId, childId)
  }

  const getChildName = (id: string) => children.find(c => c.id === id)?.name || '—'

  const getXpTotal = () => xpTransactions.reduce((sum, t) => sum + t.amount, 0)
  const getMoneyTotal = () => moneyTransactions.reduce((sum, t) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0)

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto"><div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div></div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader title="سجل المعاملات" subtitle="حركة النقاط والرصيد المالي لكل طفل" backHref="/dashboard" />

          {/* Child Selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onClick={() => handleChildChange('all')}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
              style={{ background: selectedChild === 'all' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: selectedChild === 'all' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
              الجميع
            </button>
            {children.filter(c => c.role === 'child').map(child => (
              <button key={child.id} onClick={() => handleChildChange(child.id)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={{ background: selectedChild === child.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: selectedChild === child.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                {child.name}
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="ghrs-card p-4 text-center">
              <StarIcon size={24} color="var(--ghrs-amber-500)" className="mx-auto mb-2" />
              <div className="text-2xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{getXpTotal()}</div>
              <div className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>إجمالي النقاط</div>
            </div>
            <div className="ghrs-card p-4 text-center">
              <CoinIcon size={24} color="var(--ghrs-green-500)" className="mx-auto mb-2" />
              <div className="text-2xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{fmtMoney(getMoneyTotal())}</div>
              <div className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>إجمالي الرصيد</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('xp')}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: activeTab === 'xp' ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)', color: activeTab === 'xp' ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-secondary)' }}>
              <StarIcon size={16} /> النقاط ({xpTransactions.length})
            </button>
            <button onClick={() => setActiveTab('money')}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: activeTab === 'money' ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)', color: activeTab === 'money' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
              <CoinIcon size={16} /> الأموال ({moneyTransactions.length})
            </button>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {activeTab === 'xp' ? (
              xpTransactions.length === 0 ? (
                <EmptyState icon={<StarIcon size={48} />} title="لا توجد معاملات" description="لم تُسجل أي نقاط بعد" />
              ) : xpTransactions.map(tx => (
                <div key={tx.id} className="ghrs-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: tx.amount > 0 ? 'var(--ghrs-green-50)' : 'var(--ghrs-red-50)' }}>
                      {tx.amount > 0 ? <StarIcon size={20} color="var(--ghrs-green-600)" /> : <span className="text-red-500 font-bold">-</span>}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                        {getChildName(tx.member_id)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>{tx.description || tx.source}</p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{new Date(tx.created_at).toLocaleString('ar')}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: tx.amount > 0 ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-600)' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))
            ) : (
              moneyTransactions.length === 0 ? (
                <EmptyState icon={<CoinIcon size={48} />} title="لا توجد معاملات" description="لم يُسجل أي رصيد مالي بعد" />
              ) : moneyTransactions.map(tx => (
                <div key={tx.id} className="ghrs-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: tx.type === 'earned' ? 'var(--ghrs-green-50)' : 'var(--ghrs-red-50)' }}>
                      {tx.type === 'earned' ? <CoinIcon size={20} color="var(--ghrs-green-600)" /> : <span className="text-red-500 font-bold">-</span>}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                        {getChildName(tx.member_id)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>{tx.description || tx.source}</p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{new Date(tx.created_at).toLocaleString('ar')}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: tx.type === 'earned' ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-600)' }}>
                    {tx.type === 'earned' ? '+' : '-'}{fmtMoney(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
