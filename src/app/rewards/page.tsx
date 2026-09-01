'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'

export default function RewardsPage() {
  const [gifts, setGifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newGift, setNewGift] = useState({ title: '', description: '', cost_xp: 100, cost_money: 0 })
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getGifts = async () => {
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

      const { data: giftsData } = await supabase
        .from('gifts')
        .select('*')
        .eq('family_id', memberData.family_id)
        .order('created_at', { ascending: false })

      setGifts(giftsData || [])
      setLoading(false)
    }

    getGifts()
  }, [])

  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: identity } = await supabase
      .from('auth_identities')
      .select('member_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!identity) return

    const { data: memberData } = await supabase
      .from('members')
      .select('family_id')
      .eq('id', identity.member_id)
      .single()

    if (!memberData) return

    const { data: gift, error: giftError } = await supabase
      .from('gifts')
      .insert({
        family_id: memberData.family_id,
        title: newGift.title,
        description: newGift.description || null,
        cost_xp: newGift.cost_xp,
        cost_money: newGift.cost_money || null,
        is_active: true,
        created_by: identity.member_id,
      })
      .select()
      .single()

    if (giftError) {
      setError(giftError.message)
      return
    }

    setGifts([gift, ...gifts])
    setShowAdd(false)
    setNewGift({ title: '', description: '', cost_xp: 100, cost_money: 0 })
    setToast({ type: 'success', message: 'تم إضافة الهدية بنجاح!' })
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
        <ParentBottomNav />
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

      <ParentSidebar />

      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader 
            title="المكافآت"
            subtitle="إدارة الهدايا والمكافآت"
            backHref="/dashboard"
            action={
              <button
                onClick={() => setShowAdd(true)}
                className="ghrs-btn-primary"
              >
                + إضافة هدية
              </button>
            }
          />

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
              {error}
            </div>
          )}

          {/* Add Gift Form */}
          {showAdd && (
            <div className="ghrs-card p-6 mb-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>هدية جديدة</h2>
              <form onSubmit={handleAddGift} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم الهدية</label>
                  <input
                    type="text"
                    value={newGift.title}
                    onChange={(e) => setNewGift({ ...newGift, title: e.target.value })}
                    required
                    className="ghrs-input"
                    placeholder="لعبة جديدة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الوصف (اختياري)</label>
                  <input
                    type="text"
                    value={newGift.description}
                    onChange={(e) => setNewGift({ ...newGift, description: e.target.value })}
                    className="ghrs-input"
                    placeholder="لعبة مميزة"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>التكلفة (XP)</label>
                    <input
                      type="number"
                      value={newGift.cost_xp}
                      onChange={(e) => setNewGift({ ...newGift, cost_xp: parseInt(e.target.value) })}
                      required
                      min="1"
                      className="ghrs-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>التكلفة المالية (اختياري)</label>
                    <input
                      type="number"
                      value={newGift.cost_money}
                      onChange={(e) => setNewGift({ ...newGift, cost_money: parseInt(e.target.value) })}
                      min="0"
                      className="ghrs-input"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="ghrs-btn-primary">إضافة</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* Gifts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gifts.map((gift) => (
              <div key={gift.id} className="ghrs-card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎁</span>
                    <div>
                      <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{gift.title}</h3>
                      {gift.description && (
                        <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{gift.description}</p>
                      )}
                    </div>
                  </div>
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-bold"
                    style={{ 
                      background: gift.is_active ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)',
                      color: gift.is_active ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-tertiary)'
                    }}
                  >
                    {gift.is_active ? 'متاحة' : 'غير متاحة'}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>⭐ {gift.cost_xp} XP</span>
                  {gift.cost_money > 0 && (
                    <span className="font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>💰 {gift.cost_money}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {gifts.length === 0 && (
            <EmptyState
              icon="🎁"
              title="لم تتم إضافة أي هدايا بعد"
              description="أضف هدايا ومكافآت لتحفيز أطفالك"
              action={
                <button onClick={() => setShowAdd(true)} className="ghrs-btn-primary">
                  + أضف أول هدية
                </button>
              }
            />
          )}
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
