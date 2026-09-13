'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { getCurrentUser } from '@/lib/auth/helper'
import { CheckIcon, RejectIcon, ClockIcon, StarIcon, GiftsIcon } from '@/components/icons'

interface PendingRedemption {
  id: string
  gift_id: string
  member_id: string
  requested_xp_cost: number
  status: string
  redeemed_at: string
  gift_title?: string
  child_name?: string
}

export default function GiftApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState<PendingRedemption[]>([])
  const [loading, setLoading] = useState(true)
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

      const response = await fetch('/api/gifts/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'pending' }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        router.push('/family-login')
        return
      }

      setPendingRequests(result.pending_redemptions || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleApprove = async (redemptionId: string) => {
    setProcessingId(redemptionId)
    try {
      const response = await fetch('/api/gifts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemption_id: redemptionId }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ' })
        setProcessingId(null)
        return
      }
      setPendingRequests(prev => prev.filter(r => r.id !== redemptionId))
      setToast({ type: 'success', message: 'تمت الموافقة على الهدية' })
    } catch {
      setToast({ type: 'error', message: 'حدث خطأ غير متوقع' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (redemptionId: string) => {
    setProcessingId(redemptionId)
    try {
      const response = await fetch('/api/gifts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemption_id: redemptionId }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ' })
        setProcessingId(null)
        return
      }
      setPendingRequests(prev => prev.filter(r => r.id !== redemptionId))
      setToast({ type: 'success', message: 'تم رفض طلب الهدية' })
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
        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--ghrs-text-primary)' }}>
            <GiftsIcon size={20} className="inline" /> طلبات الهدايا
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>مراجعة واعتماد طلبات الأطفال</p>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="ghrs-card p-10 text-center">
            <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>لا توجد طلبات هدايا معلقة</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingRequests.map((req) => (
              <div key={req.id} className="ghrs-card p-3.5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>
                      {req.gift_title || 'هدية'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {req.child_name || 'طفل'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--ghrs-text-secondary)' }}>
                      <StarIcon size={12} className="inline" /> {req.requested_xp_cost} XP
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {new Date(req.redeemed_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1 ghrs-btn-primary text-xs py-2 justify-center"
                  >
                    <CheckIcon size={12} /> موافقة
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1 ghrs-btn-danger text-xs py-2 justify-center"
                  >
                    <RejectIcon size={12} /> رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
