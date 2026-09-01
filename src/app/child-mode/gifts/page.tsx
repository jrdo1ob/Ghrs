'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'

export default function ChildGiftsPage() {
  const [gifts, setGifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [xp, setXp] = useState(0)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const childId = localStorage.getItem('child_id')
      if (!childId) {
        router.push('/family-login')
        return
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', childId)
        .single()

      if (!memberData || memberData.role !== 'child') {
        router.push('/family-login')
        return
      }

      const { data: giftsData } = await supabase
        .from('gifts')
        .select('*')
        .eq('family_id', memberData.family_id)
        .eq('is_active', true)

      setGifts(giftsData || [])

      const { data: xpData } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('member_id', childId)

      const totalXp = xpData?.reduce((sum, t) => sum + t.amount, 0) || 0
      setXp(totalXp)
      setLoading(false)
    }

    getData()
  }, [])

  const handleRedeem = async (gift: any) => {
    const childId = localStorage.getItem('child_id')
    if (!childId || redeeming) return

    setRedeeming(gift.id)

    const { data, error } = await supabase.rpc('redeem_gift', {
      p_gift_id: gift.id,
      p_member_id: childId
    })

    if (error || !data?.success) {
      setToast({ type: 'error', message: data?.message || 'حدث خطأ' })
      setRedeeming(null)
      return
    }

    // Refresh XP from server to get accurate balance
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('amount')
      .eq('member_id', childId)

    const totalXp = xpData?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0
    setXp(totalXp)
    setRedeeming(null)
    setToast({ type: 'success', message: `تم طلب الهدية "${gift.title}"! انتظر موافقة الوالد 🎁` })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🎁</div>
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري تحميل الهدايا...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        {/* XP Display */}
        <div className="ghrs-card p-5 mb-6 text-center">
          <div className="text-3xl mb-2">⭐</div>
          <p className="text-3xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
          <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>نقاط الخبرة المتاحة</p>
        </div>

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ghrs-text-primary)' }}>🎁 الهدايا</h1>

        {gifts.length === 0 ? (
          <EmptyState
            icon="🎁"
            title="ما في هدايا حالياً"
            description="الوالد لم يضف هدايا بعد. انتظر!"
          />
        ) : (
          <div className="space-y-3">
            {gifts.map((gift) => {
              const canAfford = xp >= gift.cost_xp

              return (
                <div
                  key={gift.id}
                  className="ghrs-card p-5"
                  style={{
                    opacity: canAfford ? 1 : 0.6,
                    border: canAfford ? '2px solid var(--ghrs-amber-300)' : '1px solid var(--ghrs-border-default)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">🎁</span>
                        <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{gift.title}</h3>
                      </div>
                      {gift.description && (
                        <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{gift.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                          ⭐ {gift.cost_xp} XP
                        </span>
                        {gift.cost_money > 0 && (
                          <span className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                            💰 {fmtMoney(gift.cost_money)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRedeem(gift)}
                      disabled={!canAfford || redeeming === gift.id}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: canAfford ? 'var(--ghrs-amber-500)' : 'var(--ghrs-bg-tertiary)',
                        color: canAfford ? 'white' : 'var(--ghrs-text-tertiary)',
                        opacity: redeeming === gift.id ? 0.7 : 1
                      }}
                    >
                      {redeeming === gift.id ? '⏳ جاري...' : canAfford ? 'اطلب!' : '🔒'}
                    </button>
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
