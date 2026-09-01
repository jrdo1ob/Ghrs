'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { Story, PresetStory } from '@/lib/types'

const MORAL_VALUES = ['الصدق', 'البر', 'النظام', 'الإيثار', 'العلم', 'التعاون', 'الشكر', 'الصبر']

export default function StoriesPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [presetStories, setPresetStories] = useState<PresetStory[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
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

      const { data: childrenData } = await supabase
        .from('members').select('id, name').eq('family_id', user.familyId).eq('role', 'child').eq('is_deleted', false)
      setChildren(childrenData || [])

      const [storiesRes, presetsRes] = await Promise.all([
        supabase.from('stories').select('*').eq('family_id', user.familyId).order('created_at', { ascending: false }),
        supabase.from('preset_stories').select('*').order('sort_order'),
      ])

      setStories(storiesRes.data || [])
      setPresetStories(presetsRes.data || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUser || !customForm.title.trim() || !customForm.content.trim()) return

    const { data: storyId, error } = await supabase.rpc('create_story', {
      p_family_id: authUser.familyId,
      p_title: customForm.title,
      p_content: customForm.content,
      p_moral_value: customForm.moral_value,
      p_reward_xp: customForm.reward_xp,
      p_assigned_to: customForm.assigned_to || null,
    })

    if (error) { setToast({ type: 'error', message: error.message }); return }

    const newStory: Story = {
      id: storyId, family_id: authUser.familyId, title: customForm.title,
      content: customForm.content, moral_value: customForm.moral_value,
      reward_xp: customForm.reward_xp, assigned_to: customForm.assigned_to || null,
      is_preset: false, is_active: true, created_by: authUser.memberId,
      created_at: new Date().toISOString(),
    }
    setStories([newStory, ...stories])
    setCustomForm({ title: '', content: '', moral_value: 'الصدق', reward_xp: 5, assigned_to: '' })
    setShowAdd(false)
    setActiveTab('my')
    setToast({ type: 'success', message: 'تم إنشاء القصة وتعيينها كمهمة قراءة! 📖' })
  }

  const handleAddPreset = async (preset: PresetStory) => {
    if (!authUser) return
    const { data: storyId, error } = await supabase.rpc('add_preset_story', {
      p_preset_id: preset.id,
      p_family_id: authUser.familyId,
      p_assigned_to: selectedChild || null,
    })
    if (error) { setToast({ type: 'error', message: error.message }); return }

    const newStory: Story = {
      id: storyId, family_id: authUser.familyId, title: preset.title,
      content: preset.content, moral_value: preset.moral_value,
      reward_xp: 5, assigned_to: selectedChild || null,
      is_preset: true, is_active: true, created_by: authUser.memberId,
      created_at: new Date().toISOString(),
    }
    setStories([newStory, ...stories])
    setToast({ type: 'success', message: `تمت إضافة "${preset.title}" كمهمة قراءة! 📖` })
  }

  const handleDeleteStory = async () => {
    if (!deleteConfirm) return
    const { error } = await supabase.rpc('delete_story', { p_story_id: deleteConfirm.id })
    if (error) { setToast({ type: 'error', message: 'حدث خطأ' }); setDeleteConfirm(null); return }
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
          <PageHeader title="📖 القصص التربوية" subtitle="مكتبة القصص وإنشاء قصص مخصصة" backHref="/tasks" action={
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(!showAdd)} className="ghrs-btn-primary">{showAdd ? '📚 المكتبة' : '✏️ قصة جديدة'}</button>
            </div>
          } />

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'library', label: '📚 المكتبة', count: presetStories.length },
              { id: 'my', label: '📖 قصصي', count: stories.length },
              { id: 'custom', label: '✏️ قصة جديدة', count: 0 },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap" style={{ background: activeTab === tab.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: activeTab === tab.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Child Filter */}
          {children.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>تعيين لـ:</span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedChild(null)} className="px-3 py-1 rounded-lg text-xs font-bold transition-all" style={{ background: !selectedChild ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: !selectedChild ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>الجميع</button>
                {children.map(c => (
                  <button key={c.id} onClick={() => setSelectedChild(c.id)} className="px-3 py-1 rounded-lg text-xs font-bold transition-all" style={{ background: selectedChild === c.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: selectedChild === c.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>👶 {c.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Stories Library */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {presetStories.length === 0 ? (
                <EmptyState icon="📚" title="لا توجد قصص في المكتبة" description="جاري تحميل القصص..." />
              ) : presetStories.map(preset => (
                <div key={preset.id} className="ghrs-card p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{preset.icon}</span>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{preset.title}</h3>
                      </div>
                      <p className="text-sm mb-2" style={{ color: 'var(--ghrs-text-secondary)', lineHeight: '1.8' }}>{preset.content.substring(0, 150)}...</p>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)' }}>🌟 {preset.moral_value}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-amber-50)', color: 'var(--ghrs-amber-700)' }}>⭐ 5 XP</span>
                      </div>
                    </div>
                    <button onClick={() => handleAddPreset(preset)} className="px-3 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: 'var(--ghrs-green-500)', color: 'white' }}>
                      📖 تعيين
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom Story Form */}
          {activeTab === 'custom' && (
            <div className="ghrs-card p-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>✏️ إنشاء قصة جديدة</h2>
              <form onSubmit={handleCreateStory} className="space-y-4">
                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>عنوان القصة *</label><input type="text" value={customForm.title} onChange={e => setCustomForm({ ...customForm, title: e.target.value })} required className="ghrs-input w-full" placeholder="النحلة والوردة" /></div>
                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>نص القصة *</label><textarea value={customForm.content} onChange={e => setCustomForm({ ...customForm, content: e.target.value })} required className="ghrs-input w-full" rows={6} placeholder="كانت هناك نحلة صغيرة..." style={{ lineHeight: '2' }} /></div>

                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>القيمة التربوية</label>
                  <div className="flex flex-wrap gap-2">
                    {MORAL_VALUES.map(v => (
                      <button key={v} type="button" onClick={() => setCustomForm({ ...customForm, moral_value: v })}
                        className="px-3 py-1 rounded-xl text-xs font-bold transition-all border-2"
                        style={{ borderColor: customForm.moral_value === v ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: customForm.moral_value === v ? 'var(--ghrs-green-100)' : 'transparent', color: customForm.moral_value === v ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>مكافأة XP</label><input type="number" value={customForm.reward_xp} onChange={e => setCustomForm({ ...customForm, reward_xp: parseInt(e.target.value) || 5 })} min="1" className="ghrs-input w-full" /></div>
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>تعيين لـ</label>
                    <select value={customForm.assigned_to} onChange={e => setCustomForm({ ...customForm, assigned_to: e.target.value })} className="ghrs-input w-full">
                      <option value="">الجميع</option>
                      {children.map(c => <option key={c.id} value={c.id}>👶 {c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="ghrs-btn-primary">📖 إنشاء القصة وتعيينها</button>
                  <button type="button" onClick={() => setActiveTab('library')} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* My Stories */}
          {activeTab === 'my' && (
            <div className="space-y-4">
              {stories.length === 0 ? (
                <EmptyState icon="📖" title="لا توجد قصص بعد" description="أضف قصة من المكتبة أو أنشئ قصة مخصصة" action={<button onClick={() => setActiveTab('library')} className="ghrs-btn-primary">📚 تصفح المكتبة</button>} />
              ) : stories.map(story => (
                <div key={story.id} className="ghrs-card p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📖</span>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{story.title}</h3>
                        {story.is_preset && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-blue-50)', color: 'var(--ghrs-blue-700)' }}>مكتبة</span>}
                      </div>
                      <p className="text-sm mb-2" style={{ color: 'var(--ghrs-text-secondary)', lineHeight: '1.8' }}>{story.content.substring(0, 120)}...</p>
                      <div className="flex gap-2">
                        {story.moral_value && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)' }}>🌟 {story.moral_value}</span>}
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-amber-50)', color: 'var(--ghrs-amber-700)' }}>⭐ {story.reward_xp} XP</span>
                        {story.assigned_to && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-purple-50)', color: 'var(--ghrs-purple-700)' }}>👶 {children.find(c => c.id === story.assigned_to)?.name || '—'}</span>}
                        {!story.assigned_to && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-purple-50)', color: 'var(--ghrs-purple-700)' }}>👨‍👩‍👧‍👦 الجميع</span>}
                      </div>
                    </div>
                    <button onClick={() => setDeleteConfirm(story)} className="p-2 rounded-lg transition-all hover:bg-ghrs-bg-tertiary" style={{ color: 'var(--ghrs-red-500)' }}>🗑️</button>
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
