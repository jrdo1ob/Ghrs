'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ParentBottomNav, ParentSidebar, PageHeader, Toast } from '@/components/layout'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'

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

    const { data, error } = await supabase.rpc('add_preset_task', {
      p_preset_id: preset.id,
      p_family_id: user.familyId,
      p_created_by: user.memberId,
    })

    if (error) {
      console.error('Add preset error:', error)
      setToast({ type: 'error', message: 'حدث خطأ أثناء إضافة المهمة: ' + error.message })
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
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors"
              style={{
                background: selectedCategory === 'all' ? 'var(--ghrs-green-500)' : 'var(--ghrs-bg-tertiary)',
                color: selectedCategory === 'all' ? 'white' : 'var(--ghrs-text-secondary)'
              }}
            >
              الكل
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors"
                style={{
                  background: selectedCategory === key ? 'var(--ghrs-green-500)' : 'var(--ghrs-bg-tertiary)',
                  color: selectedCategory === key ? 'white' : 'var(--ghrs-text-secondary)'
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Preset Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((preset) => (
              <div key={preset.id} className="ghrs-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{preset.icon}</span>
                    <div>
                      <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{preset.title}</h3>
                      <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{preset.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 text-sm">
                  <span className="font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                    ⭐ {preset.xp_reward} XP
                  </span>
                  {preset.money_reward > 0 && (
                    <span className="font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                      💰 {preset.money_reward}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ 
                      background: preset.requires_approval ? 'var(--ghrs-amber-50)' : 'var(--ghrs-green-50)',
                      color: preset.requires_approval ? 'var(--ghrs-amber-700)' : 'var(--ghrs-green-700)'
                    }}>
                    {preset.requires_approval ? 'تطلب موافقة' : 'auto'}
                  </span>
                </div>

                <button
                  onClick={() => handleAddPreset(preset)}
                  disabled={adding === preset.id}
                  className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: 'var(--ghrs-green-500)',
                    color: 'white',
                    opacity: adding === preset.id ? 0.7 : 1
                  }}
                >
                  {adding === preset.id ? '⏳ جاري...' : '+ اضافة للعائلة'}
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
