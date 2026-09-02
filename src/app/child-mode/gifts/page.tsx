'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import RewardDetailsModal from '@/components/RewardDetailsModal'
import { GiftsIcon, StarIcon, CoinIcon, ClockIcon, LockIcon } from '@/components/icons'

export default function ChildGiftsPage() {
  const [gifts, setGifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [xp, setXp] = useState(0)
  const [moneyBalance, setMoneyBalance] = useState(0)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedGift, setSelectedGift] = useState<any>(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const childId = localStorage.getItem('child_id')
      if (!childId) { router.push('/family-login'); return }

      const { data: memberData } = await supabase.from('members').select('*').eq('id', childId).single()
      if (!memberData || memberData.role !== 'child') { router.push('/family-login'); return }

      const { data: giftsData } = await supabase
        .from('gifts').select('*').eq('family_id', memberData.family_id).eq('is_active', true)
      setGifts(giftsData || [])

      const { data: xpData } = await supabase.from('xp_transactions').select('amount').eq('member_id', childId)
      const totalXp = xpData?.reduce((sum, t) => sum + t.amount, 0) || 0
      setXp(totalXp)

      const { data: moneyData } = await supabase.from('money_transactions').select('amount, type').eq('member_id', childId).eq('status', 'approved')
      const totalMoney = moneyData?.reduce((sum, t) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0) || 0
      setMoneyBalance(totalMoney)

      setLoading(false)
    }
    getData()
  }, [])

  const handleRedeem = async (giftId: string) => {
    const childId = localStorage.getItem('child_id')
    if (!childId || redeeming) return

    setRedeeming(giftId)
    setShowGiftModal(false)

    const { data, error } = await supabase.rpc('redeem_gift', { p_gift_id: giftId, p_member_id: childId })

    if (error || !data?.success) {
      setToast({ type: 'error', message: data?.message || 'حدث خطأ' })
      setRedeeming(null); return
    }

    const { data: xpData } = await supabase.from('xp_transactions').select('amount').eq('member_id', childId)
    const totalXp = xpData?.reduce((sum, t) => sum + t.amount, 0) || 0
    setXp(totalXp)
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
              return (
                <div key={gift.id} onClick={() => openGiftModal(gift)}
                  className="ghrs-card p-5 cursor-pointer active:scale-[0.98] transition-all"
                  style={{ opacity: canAfford ? 1 : 0.6, border: canAfford ? '2px solid var(--ghrs-amber-300)' : '1px solid var(--ghrs-border-default)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-purple-50)' }}>
                        <GiftsIcon size={24} color="var(--ghrs-purple-600)" />
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
                    <div className="text-xs font-bold px-3 py-2 rounded-xl" style={{ background: canAfford ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)', color: canAfford ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-tertiary)' }}>
                      {canAfford ? 'اضغط للتفاصيل' : <LockIcon size={14} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ChildBottomNav />
    </div>
  )
}
