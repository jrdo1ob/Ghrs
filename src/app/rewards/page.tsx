'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { StarIcon, CoinIcon, GiftsIcon, EditIcon, DeleteIcon, CheckIcon, RejectIcon, CopyIcon, PlusIcon } from '@/components/icons'
import IconPicker, { getIconByName } from '@/components/IconPicker'

export default function RewardsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [gifts, setGifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingGift, setEditingGift] = useState<any | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '', cost_xp: 100, cost_money: 0, icon: '' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney, symbol: currencySymbol } = useFamilyCurrency()

  useEffect(() => {
    const getGifts = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/owner-login'); return }
      setAuthUser(user)

      const { data: giftsData } = await supabase
        .from('gifts').select('*').eq('family_id', user.familyId).order('created_at', { ascending: false })

      setGifts(giftsData || [])
      setLoading(false)
    }
    getGifts()
  }, [])

  const openAdd = () => { setEditingGift(null); setFormData({ title: '', description: '', cost_xp: 100, cost_money: 0, icon: '' }); setShowAdd(true); setError('') }
  const openEdit = (gift: any) => {
    setEditingGift(gift)
    setFormData({ title: gift.title, description: gift.description || '', cost_xp: gift.cost_xp, cost_money: gift.cost_money || 0, icon: gift.icon || '' })
    setShowAdd(true); setError('')
  }

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!authUser) return

    if (editingGift) {
      const { error: updateError } = await supabase
        .from('gifts').update({ title: formData.title, description: formData.description || null, cost_xp: formData.cost_xp, cost_money: formData.cost_money || null, icon: formData.icon || null }).eq('id', editingGift.id)
      if (updateError) { setError(updateError.message); return }
      setGifts(gifts.map(g => g.id === editingGift.id ? { ...g, ...formData } : g))
      setToast({ type: 'success', message: 'تم تعديل الهدية بنجاح!' })
    } else {
      const { data: gift, error: insertError } = await supabase
        .from('gifts').insert({
          family_id: authUser.familyId, title: formData.title,
          description: formData.description || null, cost_xp: formData.cost_xp,
          cost_money: formData.cost_money || null, icon: formData.icon || null,
          is_active: true, created_by: authUser.memberId,
        }).select().single()
      if (insertError) { setError(insertError.message); return }
      setGifts([gift, ...gifts])
      setToast({ type: 'success', message: 'تم إضافة الهدية بنجاح!' })
    }
    setShowAdd(false); setEditingGift(null); setFormData({ title: '', description: '', cost_xp: 100, cost_money: 0, icon: '' })
  }

  const handleDeleteGift = async () => {
    if (!deleteConfirm) return
    const { error } = await supabase.from('gifts').delete().eq('id', deleteConfirm.id)
    if (error) { setToast({ type: 'error', message: 'حدث خطأ' }); setDeleteConfirm(null); return }
    setGifts(gifts.filter(g => g.id !== deleteConfirm.id))
    setToast({ type: 'success', message: 'تم حذف الهدية' })
    setDeleteConfirm(null)
  }

  const handleToggleActive = async (gift: any) => {
    const { error } = await supabase.from('gifts').update({ is_active: !gift.is_active }).eq('id', gift.id)
    if (error) { setToast({ type: 'error', message: 'حدث خطأ' }); return }
    setGifts(gifts.map(g => g.id === gift.id ? { ...g, is_active: !g.is_active } : g))
    setToast({ type: 'success', message: gift.is_active ? 'تم إخفاء الهدية' : 'تم تفعيل الهدية' })
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto"><div className="grid grid-cols-2 gap-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div></div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      {deleteConfirm && (
        <ConfirmDialog show={!!deleteConfirm} title="حذف الهدية" message={`هل أنت متأكد من حذف "${deleteConfirm.title}"؟`} confirmText="حذف" cancelText="إلغاء" variant="danger" onConfirm={handleDeleteGift} onCancel={() => setDeleteConfirm(null)} />
      )}

      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader title="المكافآت" subtitle="إدارة الهدايا والمكافآت" backHref="/dashboard"
            action={
              <div className="flex gap-2">
                <Link href="/reward-bank" className="ghrs-btn-secondary"><CopyIcon size={16} className="inline" /> بنك المكافآت</Link>
                <button onClick={openAdd} className="ghrs-btn-primary">+ إضافة هدية</button>
              </div>
            } />

          {error && <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)' }}>{error}</div>}

          {/* Add/Edit Form */}
          {showAdd && (
            <div className="ghrs-card p-6 mb-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>{editingGift ? 'تعديل الهدية' : 'هدية جديدة'}</h2>
              <form onSubmit={handleSaveGift} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم الهدية</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="ghrs-input w-full" placeholder="لعبة جديدة" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الوصف (اختياري)</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ghrs-input w-full" placeholder="لعبة مميزة" />
                </div>
                {/* Icon Picker */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الأيقونة</label>
                  <button type="button" onClick={() => setShowIconPicker(true)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all border-2"
                    style={{ borderColor: 'var(--ghrs-border-default)', background: 'var(--ghrs-bg-card)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-bg-tertiary)' }}>
                      {formData.icon ? (() => { const Icon = getIconByName(formData.icon); return <Icon size={20} color="var(--ghrs-green-600)" /> })() : <PlusIcon size={20} color="var(--ghrs-text-tertiary)" />}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: formData.icon ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)' }}>
                      {formData.icon ? 'تغيير الأيقونة' : 'اختر أيقونة (اختياري)'}
                    </span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>التكلفة (XP)</label>
                    <input type="number" value={formData.cost_xp} onChange={e => setFormData({ ...formData, cost_xp: parseInt(e.target.value) || 1 })} min="1" className="ghrs-input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>التكلفة المالية ({currencySymbol})</label>
                    <input type="number" value={formData.cost_money} onChange={e => setFormData({ ...formData, cost_money: parseInt(e.target.value) || 0 })} min="0" className="ghrs-input w-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="ghrs-btn-primary">{editingGift ? 'حفظ التعديلات' : 'إضافة'}</button>
                  <button type="button" onClick={() => { setShowAdd(false); setEditingGift(null) }} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* Icon Picker Modal */}
          {showIconPicker && (
            <IconPicker
              selectedIcon={formData.icon || ''}
              onSelect={(icon) => setFormData({ ...formData, icon })}
              onClose={() => setShowIconPicker(false)}
            />
          )}

          {/* Gifts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gifts.map(gift => (
              <div key={gift.id} className="ghrs-card p-5 transition-all" style={{ opacity: gift.is_active ? 1 : 0.6 }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: gift.is_active ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)' }}>
                      {gift.icon ? (() => { const Icon = getIconByName(gift.icon); return <Icon size={24} color={gift.is_active ? 'var(--ghrs-green-600)' : 'var(--ghrs-text-tertiary)'} /> })() : <GiftsIcon size={24} color={gift.is_active ? 'var(--ghrs-green-600)' : 'var(--ghrs-text-tertiary)'} />}
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{gift.title}</h3>
                      {gift.description && <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{gift.description}</p>}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex gap-4 text-sm mb-3">
                  <span className="font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}><StarIcon size={14} className="inline" /> {gift.cost_xp} XP</span>
                  {gift.cost_money > 0 && <span className="font-semibold" style={{ color: 'var(--ghrs-green-600)' }}><CoinIcon size={14} className="inline" /> {fmtMoney(gift.cost_money)}</span>}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(gift)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--ghrs-blue-50)', color: 'var(--ghrs-blue-600)' }}>
                    <EditIcon size={14} /> تعديل
                  </button>
                  <button onClick={() => handleToggleActive(gift)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: gift.is_active ? 'var(--ghrs-amber-50)' : 'var(--ghrs-green-50)', color: gift.is_active ? 'var(--ghrs-amber-600)' : 'var(--ghrs-green-600)' }}>
                    {gift.is_active ? <><RejectIcon size={14} /> إخفاء</> : <><CheckIcon size={14} /> تفعيل</>}
                  </button>
                  <button onClick={() => setDeleteConfirm(gift)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-500)' }}>
                    <DeleteIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {gifts.length === 0 && (
            <EmptyState icon={<GiftsIcon size={48} />} title="لم تتم إضافة أي هدايا بعد" description="أضف هدايا ومكافآت لتحفيز أطفالك"
              action={<button onClick={openAdd} className="ghrs-btn-primary">+ أضف أول هدية</button>} />
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
