'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { CopyIcon, GiftsIcon, StarIcon, CoinIcon, EditIcon, CheckIcon, PlusIcon, BookIcon, SparkleIcon, HeartIcon, SchoolIcon, ShieldIcon } from '@/components/icons'
import { motion } from 'framer-motion'

interface RewardPreset {
  id: string
  title: string
  description: string | null
  category: string
  default_xp: number
  default_price: number
  icon_type: string
  is_active_by_default: boolean
}

const CATEGORIES = [
  { id: 'all', label: 'الكل', icon: <GiftsIcon size={18} /> },
  { id: 'experience', label: 'تجارب و molds', icon: <StarIcon size={18} /> },
  { id: 'toys', label: 'ألعاب وهدايا', icon: <GiftsIcon size={18} /> },
  { id: 'financial', label: 'مالية', icon: <CoinIcon size={18} /> },
  { id: 'islamic', label: 'إسلامية', icon: <BookIcon size={18} /> },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  experience: { bg: 'var(--ghrs-blue-50)', text: 'var(--ghrs-blue-700)', border: 'var(--ghrs-blue-200)' },
  toys: { bg: 'var(--ghrs-purple-50)', text: 'var(--ghrs-purple-700)', border: 'var(--ghrs-purple-200)' },
  financial: { bg: 'var(--ghrs-amber-50)', text: 'var(--ghrs-amber-700)', border: 'var(--ghrs-amber-200)' },
  islamic: { bg: 'var(--ghrs-green-50)', text: 'var(--ghrs-green-700)', border: 'var(--ghrs-green-200)' },
}

const CATEGORY_LABELS: Record<string, string> = {
  experience: 'تجارب و molds',
  toys: 'ألعاب وهدايا',
  financial: 'مالية',
  islamic: 'إسلامية',
}

export default function RewardBankPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [presets, setPresets] = useState<RewardPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [editingPreset, setEditingPreset] = useState<RewardPreset | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', xp: 50, price: 0 })
  const [addConfirm, setAddConfirm] = useState<RewardPreset | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const { symbol: currencySymbol } = useFamilyCurrency()

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      const { data } = await supabase.from('reward_presets').select('*').order('category').order('default_xp')
      setPresets(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleAddToStore = async () => {
    if (!addConfirm || !authUser) return
    setAddingId(addConfirm.id)

    const { data: giftId, error } = await supabase.rpc('add_preset_reward', {
      p_preset_id: addConfirm.id,
      p_family_id: authUser.familyId,
      p_custom_xp: editForm.xp || addConfirm.default_xp,
      p_custom_price: editForm.price || addConfirm.default_price,
    })

    if (error) {
      setToast({ type: 'error', message: error.message })
      setAddingId(null)
      setAddConfirm(null)
      return
    }

    setToast({ type: 'success', message: `تمت إضافة "${addConfirm.title}" لمتجر العائلة!` })
    setAddingId(null)
    setAddConfirm(null)
    setEditForm({ title: '', description: '', xp: 50, price: 0 })
  }

  const openEdit = (preset: RewardPreset) => {
    setEditingPreset(preset)
    setEditForm({
      title: preset.title,
      description: preset.description || '',
      xp: preset.default_xp,
      price: preset.default_price,
    })
  }

  const openAdd = (preset: RewardPreset) => {
    setAddConfirm(preset)
    setEditForm({
      title: preset.title,
      description: preset.description || '',
      xp: preset.default_xp,
      price: preset.default_price,
    })
  }

  const filteredPresets = presets
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .filter(p => !searchQuery || p.title.includes(searchQuery) || (p.description && p.description.includes(searchQuery)))

  const categoryCount = (cat: string) => cat === 'all' ? presets.length : presets.filter(p => p.category === cat).length

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
      {addConfirm && (
        <ConfirmDialog
          show={!!addConfirm}
          title="إضافة للمتجر"
          message={`إضافة "${addConfirm.title}" لمتجر العائلة`}
          confirmText="إضافة"
          cancelText="إلغاء"
          variant="info"
          onConfirm={handleAddToStore}
          onCancel={() => { setAddConfirm(null); setEditForm({ title: '', description: '', xp: 50, price: 0 }) }}
        />
      )}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <PageHeader title="بنك المكافآت" subtitle="50 مكافأة تربوية جاهزة لإضافة لمتجر العائلة" backHref="/rewards" />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
              const colors = CATEGORY_COLORS[cat.id] || { bg: 'var(--ghrs-bg-tertiary)', text: 'var(--ghrs-text-secondary)', border: 'var(--ghrs-border-default)' }
              return (
                <div key={cat.id} className="ghrs-card p-4 text-center" style={{ border: `2px solid ${colors.border}` }}>
                  <div className="text-2xl font-bold" style={{ color: colors.text }}>{categoryCount(cat.id)}</div>
                  <div className="text-xs font-semibold" style={{ color: colors.text }}>{cat.label}</div>
                </div>
              )
            })}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث في المكافآت..." className="ghrs-input w-full" />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={{ background: activeCategory === cat.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: activeCategory === cat.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                {cat.icon} {cat.label} ({categoryCount(cat.id)})
              </button>
            ))}
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPresets.map(preset => {
              const colors = CATEGORY_COLORS[preset.category] || { bg: 'var(--ghrs-bg-tertiary)', text: 'var(--ghrs-text-secondary)', border: 'var(--ghrs-border-default)' }
              return (
                <motion.div key={preset.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="ghrs-card p-4 transition-all hover:shadow-lg" style={{ borderLeft: `4px solid ${colors.border}` }}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: colors.bg, color: colors.text }}>
                        {CATEGORY_LABELS[preset.category]}
                      </span>
                      <h3 className="text-base font-bold mt-2" style={{ color: 'var(--ghrs-text-primary)' }}>{preset.title}</h3>
                      {preset.description && <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>{preset.description}</p>}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                      <StarIcon size={14} className="inline" /> {preset.default_xp} XP
                    </span>
                    {preset.default_price > 0 && (
                      <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                        <CoinIcon size={14} className="inline" /> {preset.default_price} {currencySymbol}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => openAdd(preset)} disabled={addingId === preset.id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'var(--ghrs-green-500)', color: 'white', opacity: addingId === preset.id ? 0.6 : 1 }}>
                      {addingId === preset.id ? '...' : <><PlusIcon size={14} /> إضافة للمتجر</>}
                    </button>
                    <button onClick={() => openEdit(preset)}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>
                      <EditIcon size={14} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {filteredPresets.length === 0 && (
            <EmptyState icon={<GiftsIcon size={48} />} title="لا توجد مكافآت" description="لم يتم العثور على نتائج" />
          )}

          {/* Edit Modal */}
          {editingPreset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setEditingPreset(null)}>
              <div className="ghrs-card p-6 w-full max-w-md ghrs-animate-scale-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>تعديل المكافأة</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>الاسم</label>
                    <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="ghrs-input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>الوصف</label>
                    <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="ghrs-input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>نقاط XP</label>
                      <input type="number" value={editForm.xp} onChange={e => setEditForm({ ...editForm, xp: parseInt(e.target.value) || 0 })} min="0" className="ghrs-input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>السعر ({currencySymbol})</label>
                      <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })} min="0" className="ghrs-input w-full" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setAddConfirm(editingPreset); setEditingPreset(null) }} className="ghrs-btn-primary flex-1">
                    <PlusIcon size={16} className="inline" /> حفظ وإضافة للمتجر
                  </button>
                  <button onClick={() => setEditingPreset(null)} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
