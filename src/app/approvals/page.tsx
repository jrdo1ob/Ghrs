'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { getCurrentUser } from '@/lib/auth/helper'
import { CheckIcon, RejectIcon, ClockIcon, StarIcon, GiftsIcon, CoinIcon, ChildIcon, ShieldIcon, TasksIcon } from '@/components/icons'

interface ApprovalItem {
  id: string
  type: 'task' | 'gift' | 'withdrawal'
  child_name: string
  item_name: string
  xp_reward?: number
  xp_cost?: number
  money_reward?: number
  amount?: number
  requested_at: string
  status: string
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'task' | 'gift' | 'withdrawal'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()

  useEffect(() => {
    const getData = async () => {
      const authUser = await getCurrentUser()
      if (!authUser || (authUser.role !== 'parent' && authUser.role !== 'owner')) {
        router.push('/family-login')
        return
      }

      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        router.push('/family-login')
        return
      }

      setApprovals(result.approvals || [])
      setLoading(false)
    }
    getData()
  }, [])

  const filteredApprovals = approvals.filter(a => activeTab === 'all' || a.type === activeTab)
  const pendingCount = approvals.filter(a => a.status === 'pending').length

  const handleApprove = async (item: ApprovalItem) => {
    setProcessingId(item.id)
    try {
      let endpoint = ''
      let body: any = {}

      if (item.type === 'task') {
        endpoint = '/api/tasks/approve'
        body = { completion_id: item.id }
      } else if (item.type === 'gift') {
        endpoint = '/api/gifts/approve'
        body = { redemption_id: item.id }
      } else if (item.type === 'withdrawal') {
        endpoint = '/api/withdrawals/approve'
        body = { withdrawal_id: item.id, action: 'approve' }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ' })
        setProcessingId(null)
        return
      }
      setApprovals(prev => prev.filter(a => a.id !== item.id))
      setToast({ type: 'success', message: 'تمت الموافقة' })
    } catch {
      setToast({ type: 'error', message: 'حدث خطأ غير متوقع' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (item: ApprovalItem) => {
    setProcessingId(item.id)
    try {
      let endpoint = ''
      let body: any = {}

      if (item.type === 'task') {
        endpoint = '/api/tasks/reject'
        body = { completion_id: item.id }
      } else if (item.type === 'gift') {
        endpoint = '/api/gifts/reject'
        body = { redemption_id: item.id }
      } else if (item.type === 'withdrawal') {
        endpoint = '/api/withdrawals/approve'
        body = { withdrawal_id: item.id, action: 'reject' }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ' })
        setProcessingId(null)
        return
      }
      setApprovals(prev => prev.filter(a => a.id !== item.id))
      setToast({ type: 'success', message: 'تم الرفض' })
    } catch {
      setToast({ type: 'error', message: 'حدث خطأ غير متوقع' })
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ghrs-text-primary)' }}>
          <ClockIcon size={24} className="inline" /> مركز الموافقات
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'الكل', count: pendingCount },
            { key: 'task', label: 'المهام', count: approvals.filter(a => a.type === 'task' && a.status === 'pending').length },
            { key: 'gift', label: 'الهدايا', count: approvals.filter(a => a.type === 'gift' && a.status === 'pending').length },
            { key: 'withdrawal', label: 'الأموال', count: approvals.filter(a => a.type === 'withdrawal' && a.status === 'pending').length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
              style={{
                background: activeTab === tab.key ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-card)',
                color: activeTab === tab.key ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)',
                border: `2px solid ${activeTab === tab.key ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}`,
              }}>
              {tab.label} {tab.count > 0 && <span className="mr-1 px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'var(--ghrs-amber-100)', color: 'var(--ghrs-amber-700)' }}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Approval List */}
        {filteredApprovals.length === 0 ? (
          <div className="ghrs-card p-8 text-center">
            <ClockIcon size={48} className="mx-auto mb-4" color="var(--ghrs-text-tertiary)" />
            <p style={{ color: 'var(--ghrs-text-secondary)' }}>لا توجد طلبات معلقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApprovals.map(item => (
              <div key={item.id} className="ghrs-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.type === 'task' && <TasksIcon size={18} color="var(--ghrs-amber-600)" />}
                    {item.type === 'gift' && <GiftsIcon size={18} color="var(--ghrs-green-600)" />}
                    {item.type === 'withdrawal' && <CoinIcon size={18} color="var(--ghrs-blue-600)" />}
                    <div>
                      <p className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{item.item_name}</p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>{item.child_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.xp_reward !== undefined && (
                      <p className="text-sm font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                        <StarIcon size={14} className="inline" /> {item.xp_reward} XP
                      </p>
                    )}
                    {item.xp_cost !== undefined && (
                      <p className="text-sm font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                        <StarIcon size={14} className="inline" /> {item.xp_cost} XP
                      </p>
                    )}
                    {item.amount !== undefined && (
                      <p className="text-sm font-bold" style={{ color: 'var(--ghrs-blue-600)' }}>
                        <CoinIcon size={14} className="inline" /> {item.amount}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {new Date(item.requested_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                {item.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(item)} disabled={processingId === item.id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'var(--ghrs-green-500)', color: 'white' }}>
                      <CheckIcon size={14} /> موافقة
                    </button>
                    <button onClick={() => handleReject(item)} disabled={processingId === item.id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'var(--ghrs-red-500)', color: 'white' }}>
                      <RejectIcon size={14} /> رفض
                    </button>
                  </div>
                )}
                {item.status !== 'pending' && (
                  <p className="text-sm font-semibold" style={{ color: item.status === 'approved' || item.status === 'paid' ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-600)' }}>
                    {item.status === 'approved' || item.status === 'paid' ? 'تمت الموافقة' : 'تم الرفض'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
