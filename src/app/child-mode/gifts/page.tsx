'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import RewardDetailsModal from '@/components/RewardDetailsModal'
import { GiftsIcon, StarIcon, CoinIcon, ClockIcon, LockIcon } from '@/components/icons'
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
  const [childId, setChildId] = useState<string | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()

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
      setRedeeming(null); return
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
    setToast({ type: 'success', message: 'تم طلب الهدية! انتظر موافقة الوالد' })
  }

  const openGiftModal = (gift: any) => {
    setSelectedGift(gift)
    setShowGiftModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <GiftsIcon size={64} color="var(--ghrs-purple-500)" className="mx-auto mb-4 ghrs-animate-float" />
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري تحميل الهدايا...</p>
        </div>
      </div>
    )
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

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
              document.documentElement.setAttribute('data-theme', newTheme)
              localStorage.setItem('ghrs-theme', newTheme)
            }}
            className="p-3 rounded-xl transition-all"
            style={{ background: 'var(--ghrs-bg-card)', border: '2px solid var(--ghrs-border-default)' }}
            aria-label="تبديل المظهر"
          >
            {document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* XP Display */}
        <div className="ghrs-card p-5 mb-6 text-center" style={{ background: 'linear-gradient(135deg, var(--ghrs-amber-50), var(--ghrs-green-50))', border: '2px solid var(--ghrs-amber-200)' }}>
          <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--ghrs-amber-100)' }}>
            <StarIcon size={28} color="var(--ghrs-amber-600)" />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
          <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>نقاط الخبرة المتاحة</p>
        </div>

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ghrs-text-primary)' }}>الهدايا</h1>

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
        {redemptionRequests.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-10 mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>طلبات الهدايا</h2>
            <div className="space-y-2">
              {redemptionRequests.map((req: any) => {
                const getStatusInfo = (s: string) => {
                  switch (s) {
                    case 'approved': return { text: 'تم الموافقة', color: 'var(--ghrs-green-600)', bg: 'var(--ghrs-green-50)' }
                    case 'rejected': return { text: 'تم الرفض', color: 'var(--ghrs-red-600)', bg: 'var(--ghrs-red-50)' }
                    case 'revoked': return { text: 'تم سحب الموافقة', color: 'var(--ghrs-purple-600)', bg: 'var(--ghrs-purple-50)' }
                    case 'pending': return { text: 'بانتظار', color: 'var(--ghrs-amber-700)', bg: 'var(--ghrs-amber-50)' }
                    default: return { text: s, color: 'var(--ghrs-text-secondary)', bg: 'var(--ghrs-bg-tertiary)' }
                  }
                }
                const si = getStatusInfo(req.status)
                return (
                  <div key={req.id} className="ghrs-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GiftsIcon size={20} color="var(--ghrs-purple-600)" />
                        <div>
                          <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{req.gift_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: si.bg, color: si.color }}>
                              {req.status === 'pending' && <ClockIcon size={10} className="inline" />} {si.text}
                            </span>
                            {req.requested_xp != null && (
                              <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                                <StarIcon size={10} className="inline" /> {req.requested_xp} XP
                              </span>
                            )}
                            {req.money_spent != null && req.money_spent > 0 && (
                              <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                                <CoinIcon size={10} className="inline" /> {fmtMoney(req.money_spent)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        {new Date(req.date).toLocaleDateString('ar')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ChildBottomNav />
    </div>
  )
}
