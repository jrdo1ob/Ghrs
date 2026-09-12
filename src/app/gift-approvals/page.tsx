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
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ghrs-text-primary)' }}>
          <GiftsIcon size={24} className="inline" /> طلبات الهدايا
        </h1>

        {pendingRequests.length === 0 ? (
          <div className="ghrs-card p-8 text-center">
            <p style={{ color: 'var(--ghrs-text-secondary)' }}>لا توجد طلبات هدايا معلقة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="ghrs-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                      {req.gift_title || 'هدية'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>
                      {req.child_name || 'طفل'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                      <StarIcon size={14} className="inline" /> {req.requested_xp_cost} XP
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {new Date(req.redeemed_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'var(--ghrs-green-500)', color: 'white' }}
                  >
                    <CheckIcon size={14} /> موافقة
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'var(--ghrs-red-500)', color: 'white' }}
                  >
                    <RejectIcon size={14} /> رفض
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
