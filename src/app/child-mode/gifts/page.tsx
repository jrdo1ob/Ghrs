'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import RewardDetailsModal from '@/components/RewardDetailsModal'
import RequestDetailsModal from '@/components/RequestDetailsModal'
import ThemeToggle from '@/components/child/ThemeToggle'
import ChildLoading from '@/components/child/ChildLoading'
import { useSound } from '@/components/child/SoundManager'
import { GiftsIcon, StarIcon, CoinIcon, ClockIcon, LockIcon, CheckIcon, RejectIcon } from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

export default function ChildGiftsPage() {
  const [gifts, setGifts] = useState<any[]>([])
  const [redemptionRequests, setRedemptionRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [xp, setXp] = useState(0)
  const [moneyBalance, setMoneyBalance] = useState(0)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedGift, setSelectedGift] = useState<any>(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [childId, setChildId] = useState<string | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()
  const { play } = useSound()

  useEffect(() => {
    const getData = async () => {
      // Get authenticated user from secure session
      const authUser = await getCurrentUser()
      if (!authUser || authUser.role !== 'child') { router.push('/family-login'); return }
      const childId = authUser.memberId
      setChildId(childId)

      // Gifts + balances are resolved server-side, scoped to this child
      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'gifts' }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) { router.push('/family-login'); return }

      setGifts(result.gifts)
      setRedemptionRequests(result.redemption_requests || [])
      setXp(result.xp)
      setMoneyBalance(result.money_balance)

      setLoading(false)
    }
    getData()
  }, [])

  const handleRedeem = async (giftId: string) => {
    // Get authenticated user from secure session
    const authUser = await getCurrentUser()
    if (!authUser || authUser.role !== 'child' || redeeming) return

    const childId = authUser.memberId
    setRedeeming(giftId)
    setShowGiftModal(false)

    const response = await fetch('/api/gifts/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gift_id: giftId }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      setToast({ type: 'error', message: data.error || 'حدث خطأ' })
      setRedeeming(null)
      play('error')
      return
    }

    // Refresh balances server-side after a successful redemption
    const refreshResponse = await fetch('/api/child-mode/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'gifts' }),
    })
    const refreshResult = await refreshResponse.json()
    if (refreshResponse.ok && refreshResult.success) {
      setXp(refreshResult.xp)
      setMoneyBalance(refreshResult.money_balance)
    }

    setRedeeming(null)
    play('gift')
    setToast({ type: 'success', message: 'تم طلب الهدية! انتظر موافقة الوالد' })
  }

  const openGiftModal = (gift: any) => {
    setSelectedGift(gift)
    setShowGiftModal(true)
  }

  const openRequestModal = (req: any) => {
    setSelectedRequest(req)
    setShowRequestModal(true)
  }

  const openStatusModal = (status: string) => {
    setSelectedStatus(status)
    setShowStatusModal(true)
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; iconBg: string; icon: React.ReactNode }> = {
    pending: { label: 'قيد الانتظار', color: 'var(--ghrs-amber-700)', bg: 'var(--ghrs-amber-50)', iconBg: 'var(--ghrs-amber-100)', icon: <ClockIcon size={24} color="var(--ghrs-amber-600)" /> },
    rejected: { label: 'تم الرفض', color: 'var(--ghrs-red-600)', bg: 'var(--ghrs-red-50)', iconBg: 'var(--ghrs-red-100)', icon: <RejectIcon size={24} color="var(--ghrs-red-500)" /> },
    approved: { label: 'تمت الموافقة', color: 'var(--ghrs-green-600)', bg: 'var(--ghrs-green-50)', iconBg: 'var(--ghrs-green-100)', icon: <CheckIcon size={24} color="var(--ghrs-green-500)" /> },
    revoked: { label: 'تم سحب الموافقة', color: 'var(--ghrs-purple-600)', bg: 'var(--ghrs-purple-50)', iconBg: 'var(--ghrs-purple-100)', icon: <ClockIcon size={24} color="var(--ghrs-purple-500)" /> },
  }

  const groupedRequests = useMemo(() => {
    const groups: Record<string, typeof redemptionRequests> = {
      pending: [], rejected: [], revoked: [], approved: [],
    }
    for (const req of redemptionRequests) {
      if (groups[req.status]) groups[req.status].push(req)
    }
    return groups
  }, [redemptionRequests])

  if (loading) {
    return <ChildLoading text="جاري تحميل الهدايا..." icon={<GiftsIcon size={48} color="var(--ghrs-purple-500)" />} />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <RewardDetailsModal
        show={showGiftModal}
        gift={selectedGift}
        onClose={() => { setShowGiftModal(false); setSelectedGift(null) }}
        onRedeem={handleRedeem}
        childXp={xp}
        childMoney={moneyBalance}
        redeeming={redeeming}
        formatMoney={fmtMoney}
      />

      <RequestDetailsModal
        show={showRequestModal}
        request={selectedRequest}
        onClose={() => { setShowRequestModal(false); setSelectedRequest(null) }}
        formatMoney={fmtMoney}
      />

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Balance Display */}
        <div className="mb-6 rounded-3xl p-5" style={{ background: 'var(--ghrs-bg-card)', border: '1.5px solid var(--ghrs-border-default)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-1 flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)', border: '1.5px solid var(--ghrs-amber-200)' }}>
                <StarIcon size={22} color="var(--ghrs-amber-600)" />
              </div>
              <p className="text-2xl font-extrabold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
              <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>XP</p>
            </div>
            <div className="w-px h-12" style={{ background: 'var(--ghrs-border-default)' }} />
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-1 flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)', border: '1.5px solid var(--ghrs-green-200)' }}>
                <CoinIcon size={22} color="var(--ghrs-green-600)" />
              </div>
              <p className="text-2xl font-extrabold" style={{ color: 'var(--ghrs-green-600)' }}>{fmtMoney(moneyBalance)}</p>
              <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>د.ب</p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold mb-6" style={{ color: 'var(--ghrs-text-primary)' }}>هداياي</h1>

        {gifts.length === 0 ? (
          <EmptyState icon={<GiftsIcon size={48} />} title="ما في هدايا حالياً" description="الوالد لم يضف هدايا بعد. انتظر!" />
        ) : (
          <div className="space-y-3">
            {gifts.map(gift => {
              const canAfford = xp >= gift.cost_xp
              const status = gift.redemption_status
              const isPending = status === 'pending'
              const isApproved = status === 'approved'
              const isRejected = status === 'rejected'
              const isRevoked = status === 'revoked'
              return (
                <div key={gift.id} onClick={() => openGiftModal(gift)}
                  className="ghrs-card p-5 cursor-pointer active:scale-[0.98] transition-all"
                  style={{ opacity: canAfford ? 1 : 0.6, border: canAfford ? '2px solid var(--ghrs-amber-300)' : '1px solid var(--ghrs-border-default)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: isApproved ? 'var(--ghrs-green-50)' : isRevoked ? 'var(--ghrs-purple-50)' : isRejected ? 'var(--ghrs-red-50)' : 'var(--ghrs-purple-50)' }}>
                        <GiftsIcon size={24} color={isApproved ? 'var(--ghrs-green-600)' : isRevoked ? 'var(--ghrs-purple-600)' : isRejected ? 'var(--ghrs-red-600)' : 'var(--ghrs-purple-600)'} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{gift.title}</h3>
                        {gift.description && <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>{gift.description}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            <StarIcon size={14} className="inline" /> {gift.cost_xp} XP
                          </span>
                          {gift.cost_money > 0 && (
                            <span className="text-xs font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                              <CoinIcon size={14} className="inline" /> {fmtMoney(gift.cost_money)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-bold px-3 py-2 rounded-xl" style={{
                      background: isApproved ? 'var(--ghrs-green-50)' : isRevoked ? 'var(--ghrs-purple-50)' : isRejected ? 'var(--ghrs-red-50)' : isPending ? 'var(--ghrs-amber-50)' : canAfford ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)',
                      color: isApproved ? 'var(--ghrs-green-700)' : isRevoked ? 'var(--ghrs-purple-600)' : isRejected ? 'var(--ghrs-red-600)' : isPending ? 'var(--ghrs-amber-700)' : canAfford ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-tertiary)'
                    }}>
                      {isApproved ? 'تم الموافقة' : isRevoked ? 'تم سحب الموافقة' : isRejected ? 'تم الرفض' : isPending ? <><ClockIcon size={12} className="inline" /> بانتظار</> : canAfford ? 'اضغط للتفاصيل' : <LockIcon size={14} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* طلبات الهدايا */}
        <h2 className="text-xl font-bold mt-10 mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>طلبات الهدايا</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['pending', 'rejected', 'approved', 'revoked'] as const).map(key => {
            const sc = statusConfig[key]
            const count = groupedRequests[key].length
            return (
              <div key={key} onClick={() => openStatusModal(key)}
                className="cursor-pointer active:scale-[0.97] transition-all rounded-2xl p-4 flex flex-col items-center text-center gap-2"
                style={{ background: 'var(--ghrs-bg-card)', border: '1.5px solid var(--ghrs-border-default)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: sc.iconBg }}>
                  {sc.icon}
                </div>
                <span className="text-xs font-bold" style={{ color: sc.color }}>{sc.label}</span>
                <span className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{count}</span>
                <span className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>{count === 1 ? 'طلب' : 'طلبات'}</span>
              </div>
            )
          })}
        </div>

        {/* Status List Modal */}
        <AnimatePresence>
          {showStatusModal && selectedStatus && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => { setShowStatusModal(false); setSelectedStatus(null) }}
            >
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full md:max-w-sm max-h-[80vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
                style={{ background: 'var(--ghrs-bg-card)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ghrs-border-default)' }}>
                  <h3 className="text-base font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                    طلبات {statusConfig[selectedStatus].label} ({groupedRequests[selectedStatus].length})
                  </h3>
                  <button onClick={() => { setShowStatusModal(false); setSelectedStatus(null) }}
                    className="p-2 rounded-lg" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>✕</button>
                </div>
                <div className="p-4 space-y-2.5">
                  {groupedRequests[selectedStatus].map((req: any) => (
                    <div key={req.id} onClick={() => { setShowStatusModal(false); setSelectedStatus(null); openRequestModal(req) }}
                      className="cursor-pointer active:scale-[0.97] transition-all rounded-2xl p-4 flex items-center gap-3"
                      style={{ background: 'var(--ghrs-bg-primary)', border: '1px solid var(--ghrs-border-default)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-purple-50)' }}>
                        <GiftsIcon size={20} color="var(--ghrs-purple-600)" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{req.gift_name}</p>
                        <div className="flex items-center gap-2.5 mt-1">
                          {req.requested_xp != null && (
                            <span className="text-xs font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                              <StarIcon size={12} className="inline" /> {req.requested_xp} XP
                            </span>
                          )}
                          {req.money_spent != null && req.money_spent > 0 && (
                            <span className="text-xs font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                              <CoinIcon size={12} className="inline" /> {fmtMoney(req.money_spent)}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ghrs-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ transform: 'scaleX(-1)' }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  ))}
                  {groupedRequests[selectedStatus].length === 0 && (
                    <p className="text-center text-sm py-6" style={{ color: 'var(--ghrs-text-tertiary)' }}>لا توجد طلبات</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChildBottomNav />
    </div>
  )
}
