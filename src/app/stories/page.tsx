'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { Story, PresetStory } from '@/lib/types'
import { BookIcon, EditIcon, ChildIcon, StarIcon, SparkleIcon, DeleteIcon, FamilyIcon } from '@/components/icons'

const MORAL_VALUES = ['الصدق', 'البر', 'النظام', 'الإيثار', 'العلم', 'التعاون', 'الشكر', 'الصبر']

export default function StoriesPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [presetStories, setPresetStories] = useState<PresetStory[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'library' | 'custom' | 'my'>('library')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Story | null>(null)
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [customForm, setCustomForm] = useState({ title: '', content: '', moral_value: 'الصدق', reward_xp: 5, assigned_to: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      // Family stories + children are resolved server-side
      const response = await fetch('/api/stories/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) { router.push('/family-login'); return }
      setChildren(result.children)
      setStories(result.stories)

      // Global reference data — still safe to read directly
      const { data: presetsData } = await supabase
        .from('preset_stories').select('*').order('sort_order')
      setPresetStories(presetsData || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUser || !customForm.title.trim() || !customForm.content.trim()) return

    const response = await fetch('/api/stories/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: customForm.title,
        content: customForm.content,
        moral_value: customForm.moral_value,
        reward_xp: customForm.reward_xp,
        assigned_to: customForm.assigned_to || null,
      }),
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء إنشاء القصة' })
      return
    }

    const newStory: Story = {
      id: result.story_id, family_id: authUser.familyId, title: customForm.title,
      content: customForm.content, moral_value: customForm.moral_value,
      reward_xp: customForm.reward_xp, assigned_to: customForm.assigned_to || null,
      is_preset: false, is_active: true, created_by: authUser.memberId,
      created_at: new Date().toISOString(),
    }
    setStories([newStory, ...stories])
    setCustomForm({ title: '', content: '', moral_value: 'الصدق', reward_xp: 5, assigned_to: '' })
    setActiveTab('my')
    setToast({ type: 'success', message: 'تم إنشاء القصة وتعيينها كمهمة قراءة!' })
  }

  const handleAddPreset = async (preset: PresetStory) => {
    if (!authUser) return
    const response = await fetch('/api/stories/add-preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preset_id: preset.id,
        assigned_to: selectedChild || null,
      }),
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء إضافة القصة' })
      return
    }

    const newStory: Story = {
      id: result.story_id, family_id: authUser.familyId, title: preset.title,
      content: preset.content, moral_value: preset.moral_value,
      reward_xp: 5, assigned_to: selectedChild || null,
      is_preset: true, is_active: true, created_by: authUser.memberId,
      created_at: new Date().toISOString(),
    }
    setStories([newStory, ...stories])
    setToast({ type: 'success', message: `تمت إضافة "${preset.title}" كمهمة قراءة!` })
  }

  const handleDeleteStory = async () => {
    if (!deleteConfirm) return
    const response = await fetch('/api/stories/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: deleteConfirm.id }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) { setToast({ type: 'error', message: 'حدث خطأ' }); setDeleteConfirm(null); return }
    setStories(stories.filter(s => s.id !== deleteConfirm.id))
    setToast({ type: 'success', message: 'تم حذف القصة' })
    setDeleteConfirm(null)
  }

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
      {deleteConfirm && (
        <ConfirmDialog show={!!deleteConfirm} title="حذف القصة" message={`هل أنت متأكد من حذف "${deleteConfirm.title}"؟`} confirmText="حذف" cancelText="إلغاء" variant="danger" onConfirm={handleDeleteStory} onCancel={() => setDeleteConfirm(null)} />
      )}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader title="القصص التربوية" subtitle="مكتبة القصص وإنشاء قصص مخصصة" backHref="/tasks" action={
            <div className="flex gap-2">
              <button onClick={() => setActiveTab(activeTab === 'custom' ? 'library' : 'custom')} className="ghrs-btn-primary">
                {activeTab === 'custom' ? <><BookIcon size={16} className="inline" /> المكتبة</> : <><EditIcon size={16} className="inline" /> قصة جديدة</>}
              </button>
            </div>
          } />

          {/* Tabs */}
          <div className="flex gap-1.5 mb-5 border-b overflow-x-auto pb-1" style={{ borderColor: 'var(--ghrs-border-default)' }}>
            {[
              { id: 'library', label: 'المكتبة', count: presetStories.length },
              { id: 'my', label: 'قصصي', count: stories.length },
              { id: 'custom', label: 'قصة جديدة', count: 0 },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="px-3 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap" style={{ borderColor: activeTab === tab.id ? 'var(--ghrs-green-600)' : 'transparent', color: activeTab === tab.id ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Child Filter */}
          {children.length > 0 && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>تعيين لـ:</span>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setSelectedChild(null)} className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all" style={{ background: !selectedChild ? 'var(--ghrs-bg-secondary)' : 'transparent', color: !selectedChild ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)', border: `1px solid ${!selectedChild ? 'var(--ghrs-border-default)' : 'transparent'}` }}>الجميع</button>
                {children.map(c => (
                  <button key={c.id} onClick={() => setSelectedChild(c.id)} className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all" style={{ background: selectedChild === c.id ? 'var(--ghrs-bg-secondary)' : 'transparent', color: selectedChild === c.id ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)', border: `1px solid ${selectedChild === c.id ? 'var(--ghrs-border-default)' : 'transparent'}` }}><ChildIcon size={12} className="inline" /> {c.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Stories Library */}
          {activeTab === 'library' && (
            <div className="space-y-2.5">
              {presetStories.length === 0 ? (
                <EmptyState icon={<BookIcon size={32} />} title="لا توجد قصص في المكتبة" description="جاري تحميل القصص..." />
              ) : presetStories.map(preset => (
                <div key={preset.id} className="ghrs-card p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg flex-shrink-0">{preset.icon}</span>
                        <h3 className="text-sm font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{preset.title}</h3>
                      </div>
                      <p className="text-xs mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>{preset.content.substring(0, 150)}...</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ghrs-badge ghrs-badge-success"><SparkleIcon size={10} /> {preset.moral_value}</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ghrs-badge ghrs-badge-warning"><StarIcon size={10} /> 5 XP</span>
                      </div>
                    </div>
                    <button onClick={() => handleAddPreset(preset)} className="ghrs-btn-primary text-xs py-2 px-3 flex-shrink-0">
                      <BookIcon size={12} /> تعيين
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom Story Form */}
          {activeTab === 'custom' && (
            <div className="ghrs-card p-5 ghrs-animate-scale-in">
              <h2 className="text-base font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}><EditIcon size={18} className="inline" /> إنشاء قصة جديدة</h2>
              <form onSubmit={handleCreateStory} className="space-y-3">
                <div><label className="ghrs-label">عنوان القصة *</label><input type="text" value={customForm.title} onChange={e => setCustomForm({ ...customForm, title: e.target.value })} required className="ghrs-input w-full" placeholder="النحلة والوردة" /></div>
                <div><label className="ghrs-label">نص القصة *</label><textarea value={customForm.content} onChange={e => setCustomForm({ ...customForm, content: e.target.value })} required className="ghrs-input w-full" rows={6} placeholder="كانت هناك نحلة صغيرة..." /></div>

                <div><label className="ghrs-label">القيمة التربوية</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MORAL_VALUES.map(v => (
                      <button key={v} type="button" onClick={() => setCustomForm({ ...customForm, moral_value: v })}
                        className="px-3 py-1.5 rounded-md text-xs font-bold transition-all"
                        style={{ background: customForm.moral_value === v ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: customForm.moral_value === v ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${customForm.moral_value === v ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ghrs-label">مكافأة XP</label><input type="number" value={customForm.reward_xp} onChange={e => setCustomForm({ ...customForm, reward_xp: parseInt(e.target.value) || 5 })} min="1" className="ghrs-input w-full" /></div>
                  <div><label className="ghrs-label">تعيين لـ</label>
                    <select value={customForm.assigned_to} onChange={e => setCustomForm({ ...customForm, assigned_to: e.target.value })} className="ghrs-input w-full">
                      <option value="">الجميع</option>
                      {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="ghrs-btn-primary"><BookIcon size={14} /> إنشاء القصة وتعيينها</button>
                  <button type="button" onClick={() => setActiveTab('library')} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* My Stories */}
          {activeTab === 'my' && (
            <div className="space-y-4">
              {stories.length === 0 ? (
                <EmptyState icon={<BookIcon size={48} />} title="لا توجد قصص بعد" description="أضف قصة من المكتبة أو أنشئ قصة مخصصة" action={<button onClick={() => setActiveTab('library')} className="ghrs-btn-primary"><BookIcon size={16} className="inline" /> تصفح المكتبة</button>} />
              ) : stories.map(story => (
                <div key={story.id} className="ghrs-card p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg"><BookIcon size={20} className="inline" /></span>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{story.title}</h3>
                        {story.is_preset && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-blue-50)', color: 'var(--ghrs-blue-700)' }}>مكتبة</span>}
                      </div>
                      <p className="text-sm mb-2" style={{ color: 'var(--ghrs-text-secondary)', lineHeight: '1.8' }}>{story.content.substring(0, 120)}...</p>
                      <div className="flex gap-2">
                        {story.moral_value && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)' }}><SparkleIcon size={16} className="inline" /> {story.moral_value}</span>}
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-amber-50)', color: 'var(--ghrs-amber-700)' }}><StarIcon size={16} className="inline" /> {story.reward_xp} XP</span>
                        {story.assigned_to && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-purple-50)', color: 'var(--ghrs-purple-700)' }}><ChildIcon size={16} className="inline" /> {children.find(c => c.id === story.assigned_to)?.name || '—'}</span>}
                        {!story.assigned_to && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-purple-50)', color: 'var(--ghrs-purple-700)' }}><FamilyIcon size={16} className="inline" /> الجميع</span>}
                      </div>
                    </div>
                    <button onClick={() => setDeleteConfirm(story)} className="p-2 rounded-lg transition-all hover:bg-ghrs-bg-tertiary" style={{ color: 'var(--ghrs-red-500)' }}><DeleteIcon size={16} className="inline" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
