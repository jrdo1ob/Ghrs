'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { Task } from '@/lib/types'
import { CopyIcon, BookIcon, ChildIcon, StarIcon, CoinIcon, PauseIcon, PlayIcon, EditIcon, DeleteIcon, ClockIcon, FamilyIcon, CheckIcon, RejectIcon, QuranIcon, SparkleIcon, TasksIcon, PlusIcon } from '@/components/icons'
import IconPicker, { getIconByName } from '@/components/IconPicker'
import { JUZ_AMMA, fetchAyahRange, SurahInfo } from '@/lib/quran-api'

type TaskWithCompletions = Task & { completions: any[]; pendingCount: number }

const DAYS = [
  { value: 0, label: 'أحد', short: 'ح' },
  { value: 1, label: 'إثنين', short: 'ث' },
  { value: 2, label: 'ثلاثاء', short: 'ث' },
  { value: 3, label: 'أربعاء', short: 'ر' },
  { value: 4, label: 'خميس', short: 'خ' },
  { value: 5, label: 'جمعة', short: 'ج' },
  { value: 6, label: 'سبت', short: 'س' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'عالية', emoji: '🔴', color: 'var(--ghrs-red-500)' },
  { value: 'medium', label: 'متوسطة', emoji: '🟡', color: 'var(--ghrs-amber-500)' },
  { value: 'low', label: 'منخفضة', emoji: '🟢', color: 'var(--ghrs-green-500)' },
]

const TASK_TYPES = [
  { value: 'standard', label: 'مهمة عادية', icon: <CopyIcon size={20} /> },
  { value: 'quran', label: 'قراءة/حفظ قرآن', icon: <QuranIcon size={20} /> },
  { value: 'dua', label: 'دعاء/ذكر', icon: <SparkleIcon size={20} /> },
]

const QURAN_ACTIONS = [
  { value: 'read', label: 'قراءة', icon: <BookIcon size={18} /> },
  { value: 'memorize', label: 'حفظ', icon: <QuranIcon size={18} /> },
]

const emptyTask = {
  title: '', description: '', xp_reward: 10, money_reward: 0,
  frequency: 'daily', priority: 'medium', assigned_to: [] as string[],
  schedule_days: [] as number[], requires_approval: true,
  task_type: 'standard' as 'standard' | 'quran' | 'dua',
  quran_action_type: '' as '' | 'read' | 'memorize',
  surah_number: 0, from_ayah: 1, to_ayah: 1,
  custom_title: '', custom_content_text: '', icon: '',
}

export default function TasksPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [tasks, setTasks] = useState<TaskWithCompletions[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithCompletions | null>(null)
  const [formData, setFormData] = useState(emptyTask)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'paused'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<TaskWithCompletions | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [fetchingQuran, setFetchingQuran] = useState(false)
  const [quranPreview, setQuranPreview] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney, symbol: currencySymbol } = useFamilyCurrency()

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      const { data: childrenData } = await supabase
        .from('members').select('id, name').eq('family_id', user.familyId).eq('role', 'child').eq('is_deleted', false)
      setChildren(childrenData || [])

      const { data: tasksData } = await supabase
        .from('tasks').select('*').eq('family_id', user.familyId).eq('is_deleted', false).order('created_at', { ascending: false })

      const withCompletions = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: completions } = await supabase
            .from('task_completions').select('*').eq('task_id', task.id).is('approved', null)
          return { ...task, completions: completions || [], pendingCount: completions?.length || 0 }
        })
      )

      setTasks(withCompletions)
      setLoading(false)
    }
    init()
  }, [])

  // Fetch Quran text when surah/ayah selection changes
  const fetchQuranPreview = useCallback(async () => {
    if (formData.task_type !== 'quran' || !formData.surah_number || !formData.quran_action_type) {
      setQuranPreview('')
      return
    }
    setFetchingQuran(true)
    try {
      const from = formData.from_ayah || 1
      const to = formData.to_ayah || 1
      const result = await fetchAyahRange(formData.surah_number, from, to)
      setQuranPreview(result.text)
      const surahInfo = JUZ_AMMA.find(s => s.number === formData.surah_number)
      if (!formData.custom_title && surahInfo) {
        setFormData(prev => ({ ...prev, custom_title: `سورة ${surahInfo.name}` }))
      }
    } catch (e) {
      setQuranPreview('')
    } finally {
      setFetchingQuran(false)
    }
  }, [formData.task_type, formData.surah_number, formData.quran_action_type, formData.from_ayah, formData.to_ayah])

  useEffect(() => {
    const timer = setTimeout(fetchQuranPreview, 500)
    return () => clearTimeout(timer)
  }, [fetchQuranPreview])

  const openAdd = () => { setEditingTask(null); setFormData(emptyTask); setShowAdd(true); setError('') }
  const openEdit = (task: TaskWithCompletions) => {
    setEditingTask(task)
    setFormData({
      title: task.title, description: task.description || '',
      xp_reward: task.xp_reward, money_reward: task.money_reward || 0,
      frequency: task.frequency, priority: task.priority || 'medium',
      assigned_to: task.assigned_to || [], schedule_days: task.schedule_days || [],
      requires_approval: task.requires_approval,
      task_type: task.task_type || 'standard',
      quran_action_type: task.quran_action_type || '',
      surah_number: task.surah_number || 0,
      from_ayah: task.from_ayah || 1, to_ayah: task.to_ayah || 1,
      custom_title: task.custom_title || '', custom_content_text: task.custom_content_text || '',
      icon: task.icon || '',
    })
    setShowAdd(true); setError('')
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!authUser) return
    if (!formData.title.trim()) { setError('اسم المهمة مطلوب'); return }

    // For quran tasks, validate surah selection
    if (formData.task_type === 'quran' && formData.surah_number && !formData.quran_action_type) {
      setError('اختر قراءة أو حفظ'); return
    }

    const title = formData.task_type !== 'standard'
      ? `${formData.quran_action_type === 'memorize' ? 'حفظ' : 'قراءة'}: ${formData.custom_title || formData.title}`
      : formData.title

    const taskData = {
      family_id: authUser.familyId, title,
      description: formData.description || null,
      xp_reward: formData.xp_reward, money_reward: formData.money_reward || null,
      frequency: formData.frequency, priority: formData.priority,
      assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : null,
      schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : null,
      requires_approval: formData.requires_approval,
      is_active: true, created_by: authUser.memberId,
      task_type: formData.task_type,
      quran_action_type: formData.quran_action_type || null,
      surah_number: formData.surah_number || null,
      from_ayah: formData.from_ayah || null,
      to_ayah: formData.to_ayah || null,
      custom_title: formData.custom_title || null,
      custom_content_text: formData.custom_content_text || quranPreview || null,
    }

    if (editingTask) {
      const { error: rpcError } = await supabase.rpc('update_task', {
        p_task_id: editingTask.id, p_title: title,
        p_description: taskData.description, p_xp_reward: formData.xp_reward,
        p_money_reward: formData.money_reward || null,
        p_frequency: formData.frequency, p_priority: formData.priority,
        p_schedule_days: taskData.schedule_days, p_assigned_to: taskData.assigned_to,
        p_requires_approval: formData.requires_approval,
      })
      if (rpcError) { setError(rpcError.message); return }

      // Update quran fields directly
      const { error: updateError } = await supabase.from('tasks').update({
        task_type: formData.task_type, quran_action_type: formData.quran_action_type || null,
        surah_number: formData.surah_number || null, from_ayah: formData.from_ayah || null,
        to_ayah: formData.to_ayah || null, custom_title: formData.custom_title || null,
        custom_content_text: formData.custom_content_text || quranPreview || null,
      }).eq('id', editingTask.id)
      if (updateError) { setError(updateError.message); return }

      setTasks(tasks.map(t => t.id === editingTask.id ? {
        ...t, ...taskData, frequency: formData.frequency as Task['frequency'],
        priority: formData.priority as Task['priority'],
        completions: t.completions, pendingCount: t.pendingCount
      } : t) as TaskWithCompletions[])
      setToast({ type: 'success', message: 'تم تعديل المهمة بنجاح!' })
    } else {
      const { data: task, error: insertError } = await supabase.from('tasks').insert(taskData).select().single()
      if (insertError) { setError(insertError.message); return }
      setTasks([{ ...task, completions: [], pendingCount: 0 } as TaskWithCompletions, ...tasks])
      setToast({ type: 'success', message: 'تم إضافة المهمة بنجاح!' })
    }
    setShowAdd(false); setEditingTask(null); setFormData(emptyTask); setQuranPreview('')
  }

  const handleDeleteTask = async () => {
    if (!deleteConfirm) return
    const { error: rpcError } = await supabase.rpc('delete_task', { p_task_id: deleteConfirm.id })
    if (rpcError) { setToast({ type: 'error', message: 'حدث خطأ أثناء الحذف' }); setDeleteConfirm(null); return }
    setTasks(tasks.filter(t => t.id !== deleteConfirm.id))
    setToast({ type: 'success', message: 'تم حذف المهمة بنجاح' })
    setDeleteConfirm(null)
  }

  const handleTogglePause = async (task: TaskWithCompletions) => {
    const { error: rpcError } = await supabase.rpc('toggle_task_pause', { p_task_id: task.id })
    if (rpcError) { setToast({ type: 'error', message: 'حدث خطأ' }); return }
    setTasks(tasks.map(t => t.id === task.id ? { ...t, is_paused: !t.is_paused } : t))
    setToast({ type: 'success', message: task.is_paused ? 'تم تفعيل المهمة' : 'تم إيقاف المهمة مؤقتاً' })
  }

  const handleApprove = async (completionId: string, taskId: string) => {
    if (!authUser) return
    console.log('[GHRS] Approving completion:', completionId, 'by:', authUser.memberId)
    const { data, error } = await supabase.rpc('approve_task_completion', { p_completion_id: completionId, p_approve: true })
    if (error) {
      console.error('[GHRS] Approve error:', error.message, error)
      setToast({ type: 'error', message: 'حدث خطأ: ' + error.message }); return
    }
    console.log('[GHRS] Approve success:', data)
    setTasks(tasks.map(t => t.id === taskId ? {
      ...t, completions: t.completions.filter((c: any) => c.id !== completionId),
      pendingCount: Math.max(0, (t.pendingCount || 1) - 1)
    } : t))
    setToast({ type: 'success', message: 'تمت الموافقة!' })
  }

  const handleReject = async (completionId: string, taskId: string) => {
    if (!authUser) return
    console.log('[GHRS] Rejecting completion:', completionId, 'by:', authUser.memberId)
    const { data, error } = await supabase.rpc('reject_task_completion', { p_completion_id: completionId, p_rejected_by: authUser.memberId })
    if (error) {
      console.error('[GHRS] Reject error:', error.message, error)
      setToast({ type: 'error', message: 'حدث خطأ: ' + error.message }); return
    }
    console.log('[GHRS] Reject success:', data)
    setTasks(tasks.map(t => t.id === taskId ? {
      ...t, completions: t.completions.filter((c: any) => c.id !== completionId),
      pendingCount: Math.max(0, (t.pendingCount || 1) - 1)
    } : t))
    setToast({ type: 'success', message: 'تم رفض الإنجاز' })
  }

  const [revokeConfirm, setRevokeConfirm] = useState<any>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const handleRevoke = async (completionId: string, taskId: string) => {
    if (!authUser) return
    console.log('[GHRS] Revoking approval:', completionId)
    const { data, error } = await supabase.rpc('revoke_task_approval', { p_completion_id: completionId, p_reason: revokeReason || null })
    if (error) {
      console.error('[GHRS] Revoke error:', error.message)
      setToast({ type: 'error', message: 'حدث خطأ: ' + error.message }); return
    }
    console.log('[GHRS] Revoke success:', data)
    // Update the completion status to revoked
    setTasks(tasks.map(t => t.id === taskId ? {
      ...t, completions: t.completions.map((c: any) => c.id === completionId ? { ...c, approved: false } : c)
    } : t))
    setToast({ type: 'success', message: 'تم سحب الاعتماد بنجاح' })
    setRevokeConfirm(null)
    setRevokeReason('')
  }

  const toggleAssignedChild = (childId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(childId)
        ? prev.assigned_to.filter(id => id !== childId)
        : [...prev.assigned_to, childId]
    }))
  }

  const toggleScheduleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }))
  }

  const getChildName = (id: string) => children.find(c => c.id === id)?.name || '—'

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'pending') return task.pendingCount > 0
    if (activeTab === 'completed') return task.pendingCount === 0 && !task.is_paused
    if (activeTab === 'paused') return task.is_paused
    return true
  }).filter(task => !searchQuery || task.title.includes(searchQuery))

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const sortedTasks = [...filteredTasks].sort((a, b) => (priorityOrder[a.priority || 'medium'] || 1) - (priorityOrder[b.priority || 'medium'] || 1))

  const selectedSurah = JUZ_AMMA.find(s => s.number === formData.surah_number)

  if (loading) {
    return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--ghrs-bg-primary)' }}>
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
        <ConfirmDialog show={!!deleteConfirm} title="حذف المهمة" message={`هل أنت متأكد من حذف "${deleteConfirm.title}"؟`} confirmText="حذف" cancelText="إلغاء" variant="danger" onConfirm={handleDeleteTask} onCancel={() => setDeleteConfirm(null)} />
      )}
      {revokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setRevokeConfirm(null)}>
          <div className="ghrs-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--ghrs-red-600)' }}>سحب الاعتماد</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              هل أنت متأكد من سحب اعتماد هذه المهمة؟ سيتم خصم النقاط وإتاحة المهمة مرة أخرى.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>السبب (اختياري)</label>
              <input type="text" value={revokeReason} onChange={e => setRevokeReason(e.target.value)} className="ghrs-input w-full" placeholder="مثال: تم الاعتماد بالخطأ" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRevoke(revokeConfirm.id, revokeConfirm.task_id)} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--ghrs-red-500)', color: 'white' }}>سحب الاعتماد</button>
              <button onClick={() => { setRevokeConfirm(null); setRevokeReason('') }} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard" className="text-sm font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>← العودة</Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>إدارة المهام</h1>
            <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>إنشاء وتعديل وحذف المهام</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href="/presets" className="ghrs-btn-secondary text-sm flex-1 min-w-0 justify-center"><CopyIcon size={16} className="inline" /> بنك المهام</Link>
              <Link href="/stories" className="ghrs-btn-secondary text-sm flex-1 min-w-0 justify-center"><BookIcon size={16} className="inline" /> القصص</Link>
              <button onClick={openAdd} className="ghrs-btn-primary text-sm flex-1 min-w-0 justify-center">+ إضافة مهمة</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { id: 'all', label: 'الكل', count: tasks.length },
              { id: 'pending', label: 'بانتظار', count: tasks.filter(t => t.pendingCount > 0).length },
              { id: 'completed', label: 'تمت', count: tasks.filter(t => t.pendingCount === 0 && !t.is_paused).length },
              { id: 'paused', label: 'موقوفة', count: tasks.filter(t => t.is_paused).length },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0" style={{ background: activeTab === tab.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: activeTab === tab.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث في المهام..." className="ghrs-input w-full" />
          </div>

          {error && <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)' }}>{error}</div>}

          {/* Add/Edit Form */}
          {showAdd && (
            <div className="ghrs-card p-6 mb-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>{editingTask ? 'تعديل المهمة' : 'مهمة جديدة'}</h2>
              <form onSubmit={handleSaveTask} className="space-y-4">

                {/* Task Type Selector */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>نوع المهمة</label>
                  <div className="flex gap-2">
                    {TASK_TYPES.map(tt => (
                      <button key={tt.value} type="button" onClick={() => setFormData({ ...formData, task_type: tt.value as any, surah_number: 0, from_ayah: 1, to_ayah: 1, custom_title: '', custom_content_text: '', quran_action_type: '' })}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 flex-1"
                        style={{ borderColor: formData.task_type === tt.value ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: formData.task_type === tt.value ? 'var(--ghrs-green-50)' : 'transparent', color: formData.task_type === tt.value ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                        {tt.icon} {tt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quran Action Type (only for quran tasks) */}
                {formData.task_type === 'quran' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الهدف</label>
                    <div className="flex gap-2">
                      {QURAN_ACTIONS.map(qa => (
                        <button key={qa.value} type="button" onClick={() => setFormData({ ...formData, quran_action_type: qa.value as any })}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 flex-1"
                          style={{ borderColor: formData.quran_action_type === qa.value ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: formData.quran_action_type === qa.value ? 'var(--ghrs-green-50)' : 'transparent', color: formData.quran_action_type === qa.value ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                          {qa.icon} {qa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Source Selector (only for quran/dua) */}
                {formData.task_type !== 'standard' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>مصدر المحتوى</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setFormData({ ...formData, surah_number: 0 })}
                        className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2"
                        style={{ borderColor: !formData.surah_number ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: !formData.surah_number ? 'var(--ghrs-green-50)' : 'transparent', color: !formData.surah_number ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                        ✏️ نص مخصص
                      </button>
                      {formData.task_type === 'quran' && (
                        <button type="button" onClick={() => setFormData({ ...formData, surah_number: 114 })}
                          className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2"
                          style={{ borderColor: formData.surah_number ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: formData.surah_number ? 'var(--ghrs-green-50)' : 'transparent', color: formData.surah_number ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                        <QuranIcon size={16} className="inline" /> سور جزء عمّ
                      </button>
                    )}
                    </div>
                  </div>
                )}

                {/* Surah Picker (only for quran tasks with surah source) */}
                {formData.task_type === 'quran' && formData.surah_number > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-green-700)' }}>اختر السورة</label>
                    <select value={formData.surah_number} onChange={e => setFormData({ ...formData, surah_number: parseInt(e.target.value) })} className="ghrs-input w-full mb-3">
                      {JUZ_AMMA.map(s => <option key={s.number} value={s.number}>{s.name} ({s.englishName}) - {s.numberOfAyahs} آية</option>)}
                    </select>
                    {selectedSurah && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ghrs-green-700)' }}>من الآية</label>
                          <input type="number" min="1" max={selectedSurah.numberOfAyahs} value={formData.from_ayah} onChange={e => setFormData({ ...formData, from_ayah: parseInt(e.target.value) || 1 })} className="ghrs-input w-full" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ghrs-green-700)' }}>إلى الآية</label>
                          <input type="number" min="1" max={selectedSurah.numberOfAyahs} value={formData.to_ayah} onChange={e => setFormData({ ...formData, to_ayah: parseInt(e.target.value) || 1 })} className="ghrs-input w-full" />
                        </div>
                      </div>
                    )}
                    {/* Quran Preview */}
                    {fetchingQuran && <p className="text-sm mt-2" style={{ color: 'var(--ghrs-green-600)' }}>جاري تحميل النص القرآني...</p>}
                    {quranPreview && !fetchingQuran && (
                      <div className="mt-3 p-5 rounded-2xl text-right" style={{ 
                        background: 'linear-gradient(135deg, var(--ghrs-green-900), var(--ghrs-green-800))', 
                        border: '2px solid var(--ghrs-green-600)', 
                        fontFamily: "'Scheherazade New', 'Amiri', serif", 
                        fontSize: '1.4rem', 
                        lineHeight: '2.4', 
                        color: '#f0fdf4',
                        boxShadow: '0 4px 20px rgba(34, 197, 94, 0.2)'
                      }}>
                        <p className="text-xs font-bold mb-2" style={{ color: '#86efac' }}>النص القرآني:</p>
                        {quranPreview}
                      </div>
                    )}
                  </div>
                )}

                {/* Title */}
                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>{formData.task_type !== 'standard' ? 'عنوان المهمة / السورة' : 'اسم المهمة'} *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="ghrs-input w-full" placeholder={formData.task_type === 'quran' ? 'مثال: سورة النصر' : 'نظف الغرفة'} /></div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>الأيقونة</label>
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

                {/* Custom Title (for quran/dua) */}
                {formData.task_type !== 'standard' && !formData.surah_number && (
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>العنوان التفصيلي (السورة/الدعاء)</label><input type="text" value={formData.custom_title} onChange={e => setFormData({ ...formData, custom_title: e.target.value })} className="ghrs-input w-full" placeholder="مثال: أذكار النوم، الرقية الشرعية" /></div>
                )}

                {/* Custom Content (for quran/dua with custom source) */}
                {formData.task_type !== 'standard' && !formData.surah_number && (
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>النص (يمكن لصق النص هنا)</label>
                    <textarea value={formData.custom_content_text} onChange={e => setFormData({ ...formData, custom_content_text: e.target.value })} className="ghrs-input w-full" rows={5} placeholder="بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ&#10;الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ..." style={{ fontFamily: "'Scheherazade New', 'Amiri', serif", fontSize: '1.2rem', lineHeight: '2' }} />
                  </div>
                )}

                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>الوصف</label><input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ghrs-input w-full" placeholder="اختياري" /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>مكافأة XP</label><input type="number" value={formData.xp_reward} onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 0 })} min="1" className="ghrs-input w-full" /></div>
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>مكافأة مالية ({currencySymbol})</label><input type="number" value={formData.money_reward} onChange={e => setFormData({ ...formData, money_reward: parseInt(e.target.value) || 0 })} min="0" className="ghrs-input w-full" /></div>
                </div>

                {/* Priority */}
                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>الأولوية</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button key={p.value} type="button" onClick={() => setFormData({ ...formData, priority: p.value as any })}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2"
                        style={{ borderColor: formData.priority === p.value ? p.color : 'var(--ghrs-border-default)', background: formData.priority === p.value ? `${p.color}15` : 'transparent' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>التكرار</label>
                  <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value as any })} className="ghrs-input w-full">
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="once">مرة واحدة</option>
                    <option value="custom">أيام محددة</option>
                  </select>
                </div>

                {/* Custom Days */}
                {formData.frequency === 'custom' && (
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>اختر الأيام</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(d => (
                        <button key={d.value} type="button" onClick={() => toggleScheduleDay(d.value)}
                          className="w-10 h-10 rounded-xl text-sm font-bold transition-all border-2"
                          style={{ borderColor: formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-100)' : 'transparent', color: formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                          {d.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Child Assignment */}
                {children.length > 0 && (
                  <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>تعيين لـ</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setFormData({ ...formData, assigned_to: [] })}
                        className="px-3 py-2 rounded-xl text-sm font-bold transition-all border-2"
                        style={{ borderColor: formData.assigned_to.length === 0 ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: formData.assigned_to.length === 0 ? 'var(--ghrs-green-100)' : 'transparent', color: formData.assigned_to.length === 0 ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                        <FamilyIcon size={14} className="inline" /> الجميع
                      </button>
                      {children.map(child => (
                        <button key={child.id} type="button" onClick={() => toggleAssignedChild(child.id)}
                          className="px-3 py-2 rounded-xl text-sm font-bold transition-all border-2"
                          style={{ borderColor: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-100)' : 'transparent', color: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                          <ChildIcon size={14} className="inline" /> {child.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requires Approval */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.requires_approval} onChange={e => setFormData({ ...formData, requires_approval: e.target.checked })} className="w-4 h-4 accent-green-600" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>تتطلب موافقة الوالد</span>
                </label>

                <div className="flex gap-2">
                  <button type="submit" className="ghrs-btn-primary">{editingTask ? 'حفظ التعديلات' : 'إضافة'}</button>
                  <button type="button" onClick={() => { setShowAdd(false); setEditingTask(null); setQuranPreview('') }} className="ghrs-btn-secondary">إلغاء</button>
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

          {/* Task Cards */}
          <div className="space-y-3 sm:space-y-4">
            {sortedTasks.map((task) => {
              const priority = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[1]
              const isQuran = task.task_type === 'quran'
              const isDua = task.task_type === 'dua'
              return (
                <div key={task.id} className="ghrs-card p-3 sm:p-5 transition-all" style={{ opacity: task.is_paused ? 0.6 : 1 }}>
                  {/* Card Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: isQuran ? 'var(--ghrs-green-50)' : isDua ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)' }}>
                      {task.icon ? (() => { const Icon = getIconByName(task.icon); return <Icon size={20} color="var(--ghrs-green-600)" /> })() : isQuran ? <QuranIcon size={20} color="var(--ghrs-green-600)" /> : isDua ? <SparkleIcon size={20} color="var(--ghrs-amber-600)" /> : <TasksIcon size={20} color="var(--ghrs-text-secondary)" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{task.title}</h3>
                        {task.is_paused && <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-tertiary)' }}>موقوفة</span>}
                        {isQuran && task.quran_action_type && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0" style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)' }}>
                            {task.quran_action_type === 'memorize' ? 'حفظ' : 'قراءة'}
                          </span>
                        )}
                      </div>
                      {task.description && <p className="text-xs sm:text-sm mt-1 line-clamp-2" style={{ color: 'var(--ghrs-text-secondary)' }}>{task.description}</p>}
                    </div>
                  </div>

                  {/* Price & Info */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm mb-3">
                    <span className="font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}><StarIcon size={14} className="inline" /> {task.xp_reward} XP</span>
                    {task.money_reward != null && task.money_reward > 0 && <span className="font-semibold" style={{ color: 'var(--ghrs-green-600)' }}><CoinIcon size={14} className="inline" /> {fmtMoney(task.money_reward)}</span>}
                    <span style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {task.frequency === 'daily' ? 'يومي' : task.frequency === 'weekly' ? 'أسبوعي' : task.frequency === 'monthly' ? 'شهري' : task.frequency === 'once' ? 'مرة واحدة' : 'مخصص'}
                    </span>
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <span style={{ color: 'var(--ghrs-text-tertiary)' }}><ChildIcon size={14} className="inline" /> {task.assigned_to.map(getChildName).join(', ')}</span>
                    )}
                  </div>

                  {/* Action Buttons - Grid on mobile */}
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => openEdit(task)} className="flex items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--ghrs-blue-50)', color: 'var(--ghrs-blue-600)' }}>
                      <EditIcon size={14} /> <span className="hidden sm:inline">تعديل</span><span className="sm:hidden">تعديل</span>
                    </button>
                    <button onClick={() => handleTogglePause(task)} className="flex items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: task.is_paused ? 'var(--ghrs-green-50)' : 'var(--ghrs-amber-50)', color: task.is_paused ? 'var(--ghrs-green-600)' : 'var(--ghrs-amber-600)' }}>
                      {task.is_paused ? <><PlayIcon size={14} /> <span>تفعيل</span></> : <><PauseIcon size={14} /> <span>إيقاف</span></>}
                    </button>
                    <button onClick={() => setDeleteConfirm(task)} className="flex items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-500)' }}>
                      <DeleteIcon size={14} /> <span>حذف</span>
                    </button>
                  </div>

                  {/* Pending/Approved Completions */}
                  {task.completions && task.completions.length > 0 && (
                    <div className="mt-3 p-4 rounded-xl" style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}>
                      <p className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-amber-700)' }}><ClockIcon size={14} className="inline" /> إنجازات ({task.completions.length})</p>
                      <div className="space-y-2">
                        {task.completions.map((completion: any) => (
                          <div key={completion.id} className="p-3 rounded-lg" style={{ background: 'var(--ghrs-bg-card)' }}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-primary)' }}>{new Date(completion.completed_at).toLocaleDateString('ar')}</p>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ 
                                background: completion.approved === true ? 'var(--ghrs-green-100)' : 'var(--ghrs-amber-100)', 
                                color: completion.approved === true ? 'var(--ghrs-green-700)' : 'var(--ghrs-amber-700)' 
                              }}>
                                {completion.approved === true ? '✅ معتمدة' : '⏳ بانتظار'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {completion.approved === false ? (
                                <>
                                  <button onClick={() => handleApprove(completion.id, task.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-green-500)', color: 'white' }}><CheckIcon size={14} className="inline" /> موافقة</button>
                                  <button onClick={() => handleReject(completion.id, task.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-red-500)', color: 'white' }}><RejectIcon size={14} className="inline" /> رفض</button>
                                </>
                              ) : (
                                <button onClick={() => setRevokeConfirm(completion)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
                                  <RejectIcon size={14} className="inline" /> سحب الاعتماد
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {sortedTasks.length === 0 && <EmptyState icon={<CopyIcon size={48} />} title="لا توجد مهام" description="أضف مهاماً جديدة" action={<button onClick={openAdd} className="ghrs-btn-primary">+ إضافة مهمة</button>} />}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
