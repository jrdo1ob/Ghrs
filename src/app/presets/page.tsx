'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ParentBottomNav, ParentSidebar, PageHeader, Toast } from '@/components/layout'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { StarIcon, CoinIcon, ClockIcon } from '@/components/icons'

interface PresetTask {
  id: string
  title: string
  description: string
  category: string
  xp_reward: number
  money_reward: number
  requires_approval: boolean
  frequency: string
  icon: string
  sort_order: number
}

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  quran: { label: 'القرآن', emoji: '📖' },
  reading: { label: 'القراءة', emoji: '📚' },
  hygiene: { label: 'النظافة', emoji: '🪥' },
  chores: { label: 'الاعمال المنزلية', emoji: '🏠' },
  other: { label: 'اخرى', emoji: '💡' },
}

export default function PresetTasksPage() {
  const [presets, setPresets] = useState<PresetTask[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getPresets = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/owner-login')
        return
      }

      const { data } = await supabase
        .from('preset_tasks')
        .select('*')
        .order('sort_order')

      setPresets(data || [])
      setLoading(false)
    }

    getPresets()
  }, [])

  const handleAddPreset = async (preset: PresetTask) => {
    const user = await getCurrentUser()
    if (!user || adding) return

    setAdding(preset.id)

    const response = await fetch('/api/tasks/add-preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_id: preset.id }),
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      console.error('Add preset error:', result.error)
      setToast({ type: 'error', message: 'حدث خطأ أثناء إضافة المهمة: ' + (result.error || '') })
      setAdding(null)
      return
    }

    setToast({ type: 'success', message: `تم إضافة "${preset.title}" بنجاح!` })
    setAdding(null)
  }

  const filtered = selectedCategory === 'all' 
    ? presets 
    : presets.filter(p => p.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="ghrs-card h-24" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      <ParentSidebar />

      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader 
            title="بنك المهام المقترحة"
            subtitle="اضف مهاماً جاهزة لعائلتك"
            backHref="/tasks"
          />

          {/* Category Filter */}
          <div className="flex gap-1.5 mb-5 border-b overflow-x-auto pb-1" style={{ borderColor: 'var(--ghrs-border-default)' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-3 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2"
              style={{
                borderColor: selectedCategory === 'all' ? 'var(--ghrs-green-600)' : 'transparent',
                color: selectedCategory === 'all' ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)',
              }}
            >
              الكل
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className="px-3 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2"
                style={{
                  borderColor: selectedCategory === key ? 'var(--ghrs-green-600)' : 'transparent',
                  color: selectedCategory === key ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)',
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Preset Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((preset) => (
              <div key={preset.id} className="ghrs-card p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-bg-secondary)' }}>
                    <span className="text-lg">{preset.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{preset.title}</h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--ghrs-text-secondary)' }}>{preset.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3 pb-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--ghrs-border-default)' }}>
                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums" style={{ color: 'var(--ghrs-text-secondary)' }}>
                    <StarIcon size={12} /> {preset.xp_reward} XP
                  </span>
                  {preset.money_reward > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold tabular-nums" style={{ color: 'var(--ghrs-text-secondary)' }}>
                      <CoinIcon size={12} /> {preset.money_reward}
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ghrs-badge ${preset.requires_approval ? 'ghrs-badge-warning' : 'ghrs-badge-success'}`}>
                    {preset.requires_approval ? 'تطلب موافقة' : 'تلقائي'}
                  </span>
                </div>

                <button
                  onClick={() => handleAddPreset(preset)}
                  disabled={adding === preset.id}
                  className="w-full ghrs-btn-primary text-xs py-2 justify-center"
                  style={{ opacity: adding === preset.id ? 0.7 : 1 }}
                >
                  {adding === preset.id ? <><ClockIcon size={12} className="inline" /> جاري...</> : '+ اضافة للعائلة'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
