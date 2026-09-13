'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { AuthUser } from '@/lib/auth/helper'
import { CURRENCIES } from '@/lib/currency'
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
  const [currency, setCurrency] = useState('KWD')
  const symbol = CURRENCIES[currency]?.symbol || 'د.ك'
  const fmtMoney = (amount: number) => `${amount} ${symbol}`
  const currencySymbol = symbol

  useEffect(() => {
    const init = async () => {
      // Single authenticated request: identity + all family task data
      // resolved server-side via the authenticated data API
      const response = await fetch('/api/tasks/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) { router.push('/family-login'); return }

      if (result.member) {
        setAuthUser({
          memberId: result.member.member_id,
          name: result.member.member_name,
          role: result.member.member_role,
          familyId: result.member.family_id,
          via: 'session',
        })
      }
      if (result.currency) setCurrency(result.currency)

      setChildren(result.children)
      setTasks(result.tasks)
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
      // Use secure server API for update
      const response = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: editingTask.id,
          title,
          description: taskData.description,
          xp_reward: formData.xp_reward,
          money_reward: formData.money_reward || null,
          frequency: formData.frequency,
          priority: formData.priority,
          schedule_days: taskData.schedule_days,
          assigned_to: taskData.assigned_to,
          requires_approval: formData.requires_approval,
          task_type: formData.task_type,
          quran_action_type: formData.quran_action_type || null,
          surah_number: formData.surah_number || null,
          from_ayah: formData.from_ayah || null,
          to_ayah: formData.to_ayah || null,
          custom_title: formData.custom_title || null,
          custom_content_text: formData.custom_content_text || quranPreview || null,
          icon: formData.icon || null,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(result.error || 'تعذر تعديل المهمة، حاول مرة أخرى')
        return
      }

      setTasks(tasks.map(t => t.id === editingTask.id ? {
        ...t, ...taskData, frequency: formData.frequency as Task['frequency'],
        priority: formData.priority as Task['priority'],
        completions: t.completions, pendingCount: t.pendingCount
      } : t) as TaskWithCompletions[])
      setToast({ type: 'success', message: 'تم تعديل المهمة بنجاح!' })
    } else {
      // Use secure server API for create
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(result.error || 'تعذر إنشاء المهمة، حاول مرة أخرى')
        return
      }

      setTasks([{ ...result.task, completions: [], pendingCount: 0 } as TaskWithCompletions, ...tasks])
      setToast({ type: 'success', message: 'تم إضافة المهمة بنجاح!' })
    }
    setShowAdd(false); setEditingTask(null); setFormData(emptyTask); setQuranPreview('')
  }

  const handleDeleteTask = async () => {
    if (!deleteConfirm) return
    const response = await fetch('/api/tasks/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: deleteConfirm.id }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) { setToast({ type: 'error', message: 'حدث خطأ أثناء الحذف' }); setDeleteConfirm(null); return }
    setTasks(tasks.filter(t => t.id !== deleteConfirm.id))
    setToast({ type: 'success', message: 'تم حذف المهمة بنجاح' })
    setDeleteConfirm(null)
  }

  const handleTogglePause = async (task: TaskWithCompletions) => {
    const response = await fetch('/api/tasks/toggle-pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) { setToast({ type: 'error', message: 'حدث خطأ' }); return }
    setTasks(tasks.map(t => t.id === task.id ? { ...t, is_paused: !t.is_paused } : t))
    setToast({ type: 'success', message: task.is_paused ? 'تم تفعيل المهمة' : 'تم إيقاف المهمة مؤقتاً' })
  }

  const handleApprove = async (completionId: string, taskId: string) => {
    if (!authUser) return
    console.log('[GHRS] Approving completion:', completionId, 'by:', authUser.memberId)
    const response = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completion_id: completionId, approve: true }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      console.error('[GHRS] Approve error:', result.error)
      setToast({ type: 'error', message: 'حدث خطأ: ' + (result.error || '') }); return
    }
    setTasks(tasks.map(t => t.id === taskId ? {
      ...t, completions: t.completions.filter((c: any) => c.id !== completionId),
      pendingCount: Math.max(0, (t.pendingCount || 1) - 1)
    } : t))
    setToast({ type: 'success', message: 'تمت الموافقة!' })
  }

  const handleReject = async (completionId: string, taskId: string) => {
    if (!authUser) return
    console.log('[GHRS] Rejecting completion:', completionId, 'by:', authUser.memberId)
    const response = await fetch('/api/tasks/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completion_id: completionId }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      console.error('[GHRS] Reject error:', result.error)
      setToast({ type: 'error', message: 'حدث خطأ: ' + (result.error || '') }); return
    }
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
    const response = await fetch('/api/tasks/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completion_id: completionId, reason: revokeReason || null }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      console.error('[GHRS] Revoke error:', result.error)
      setToast({ type: 'error', message: 'حدث خطأ: ' + (result.error || '') }); return
    }
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
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold mb-3" style={{ color: 'var(--ghrs-text-secondary)' }}>
              <span style={{ direction: 'ltr' }}>←</span>
              <span>العودة</span>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--ghrs-text-primary)' }}>إدارة المهام</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>إنشاء وتعديل وحذف المهام</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href="/presets" className="ghrs-btn-secondary text-sm flex-1 min-w-0 justify-center"><CopyIcon size={14} /> بنك المهام</Link>
              <Link href="/stories" className="ghrs-btn-secondary text-sm flex-1 min-w-0 justify-center"><BookIcon size={14} /> القصص</Link>
              <button onClick={openAdd} className="ghrs-btn-primary text-sm flex-1 min-w-0 justify-center">+ إضافة مهمة</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ borderColor: 'var(--ghrs-border-default)' }}>
            {[
              { id: 'all', label: 'الكل', count: tasks.length },
              { id: 'pending', label: 'بانتظار', count: tasks.filter(t => t.pendingCount > 0).length },
              { id: 'completed', label: 'تمت', count: tasks.filter(t => t.pendingCount === 0 && !t.is_paused).length },
              { id: 'paused', label: 'موقوفة', count: tasks.filter(t => t.is_paused).length },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="px-3 py-2 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap flex-shrink-0" style={{ borderColor: activeTab === tab.id ? 'var(--ghrs-green-600)' : 'transparent', color: activeTab === tab.id ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)' }}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث في المهام..." className="ghrs-input w-full" />
          </div>

          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>{error}</div>}

          {/* Add Form - only for new tasks */}
          {showAdd && !editingTask && (
            <div className="ghrs-card p-5 mb-5 ghrs-animate-scale-in">
              <h2 className="text-base font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>مهمة جديدة</h2>
              <form onSubmit={handleSaveTask} className="space-y-3">

                {/* Task Type Selector */}
                <div>
                  <label className="ghrs-label">نوع المهمة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TASK_TYPES.map(tt => (
                      <button key={tt.value} type="button" onClick={() => setFormData({ ...formData, task_type: tt.value as any, surah_number: 0, from_ayah: 1, to_ayah: 1, custom_title: '', custom_content_text: '', quran_action_type: '' })}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: formData.task_type === tt.value ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.task_type === tt.value ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.task_type === tt.value ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                        {tt.icon} {tt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quran Action Type (only for quran tasks) */}
                {formData.task_type === 'quran' && (
                  <div>
                    <label className="ghrs-label">الهدف</label>
                    <div className="grid grid-cols-2 gap-2">
                      {QURAN_ACTIONS.map(qa => (
                        <button key={qa.value} type="button" onClick={() => setFormData({ ...formData, quran_action_type: qa.value as any })}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: formData.quran_action_type === qa.value ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.quran_action_type === qa.value ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.quran_action_type === qa.value ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                          {qa.icon} {qa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Source Selector (only for quran/dua) */}
                {formData.task_type !== 'standard' && (
                  <div>
                    <label className="ghrs-label">مصدر المحتوى</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setFormData({ ...formData, surah_number: 0 })}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ background: !formData.surah_number ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: !formData.surah_number ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${!formData.surah_number ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                        ✏️ نص مخصص
                      </button>
                      {formData.task_type === 'quran' && (
                        <button type="button" onClick={() => setFormData({ ...formData, surah_number: 114 })}
                          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: formData.surah_number ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.surah_number ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.surah_number ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                          <QuranIcon size={14} /> سور جزء عمّ
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Surah Picker (only for quran tasks with surah source) */}
                {formData.task_type === 'quran' && formData.surah_number > 0 && (
                  <div className="p-4 rounded-lg" style={{ background: 'var(--ghrs-bg-secondary)', border: '1px solid var(--ghrs-border-default)' }}>
                    <label className="ghrs-label">اختر السورة</label>
                    <select value={formData.surah_number} onChange={e => setFormData({ ...formData, surah_number: parseInt(e.target.value) })} className="ghrs-input w-full mb-3">
                      {JUZ_AMMA.map(s => <option key={s.number} value={s.number}>{s.name} ({s.englishName}) - {s.numberOfAyahs} آية</option>)}
                    </select>
                    {selectedSurah && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="ghrs-label">من الآية</label>
                          <input type="number" min="1" max={selectedSurah.numberOfAyahs} value={formData.from_ayah} onChange={e => setFormData({ ...formData, from_ayah: parseInt(e.target.value) || 1 })} className="ghrs-input w-full" />
                        </div>
                        <div>
                          <label className="ghrs-label">إلى الآية</label>
                          <input type="number" min="1" max={selectedSurah.numberOfAyahs} value={formData.to_ayah} onChange={e => setFormData({ ...formData, to_ayah: parseInt(e.target.value) || 1 })} className="ghrs-input w-full" />
                        </div>
                      </div>
                    )}
                    {/* Quran Preview */}
                    {fetchingQuran && <p className="text-xs mt-2" style={{ color: 'var(--ghrs-text-secondary)' }}>جاري تحميل النص القرآني...</p>}
                    {quranPreview && !fetchingQuran && (
                      <div className="mt-3 p-5 rounded-lg text-right" style={{
                        background: 'var(--ghrs-bg-secondary)',
                        border: '1px solid var(--ghrs-border-default)',
                        fontFamily: "'Scheherazade New', 'Amiri', serif",
                        fontSize: '1.2rem',
                        lineHeight: '2',
                        color: 'var(--ghrs-text-primary)',
                      }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ghrs-text-tertiary)' }}>النص القرآني</p>
                        {quranPreview}
                      </div>
                    )}
                  </div>
                )}

                {/* Title */}
                <div><label className="ghrs-label">{formData.task_type !== 'standard' ? 'عنوان المهمة / السورة' : 'اسم المهمة'} *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="ghrs-input w-full" placeholder={formData.task_type === 'quran' ? 'مثال: سورة النصر' : 'نظف الغرفة'} /></div>

                {/* Icon Picker */}
                <div>
                  <label className="ghrs-label">الأيقونة</label>
                  <button type="button" onClick={() => setShowIconPicker(true)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-all"
                    style={{ background: 'var(--ghrs-bg-secondary)', border: '1px solid var(--ghrs-border-default)' }}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--ghrs-bg-card)' }}>
                      {formData.icon ? (() => { const Icon = getIconByName(formData.icon); return <Icon size={16} color="var(--ghrs-green-600)" /> })() : <PlusIcon size={16} color="var(--ghrs-text-tertiary)" />}
                    </div>
                    <span className="text-sm font-medium" style={{ color: formData.icon ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)' }}>
                      {formData.icon ? 'تغيير الأيقونة' : 'اختر أيقونة (اختياري)'}
                    </span>
                  </button>
                </div>

                {/* Custom Title (for quran/dua) */}
                {formData.task_type !== 'standard' && !formData.surah_number && (
                  <div><label className="ghrs-label">العنوان التفصيلي (السورة/الدعاء)</label><input type="text" value={formData.custom_title} onChange={e => setFormData({ ...formData, custom_title: e.target.value })} className="ghrs-input w-full" placeholder="مثال: أذكار النوم، الرقية الشرعية" /></div>
                )}

                {/* Custom Content (for quran/dua with custom source) */}
                {formData.task_type !== 'standard' && !formData.surah_number && (
                  <div><label className="ghrs-label">النص (يمكن لصق النص هنا)</label>
                    <textarea value={formData.custom_content_text} onChange={e => setFormData({ ...formData, custom_content_text: e.target.value })} className="ghrs-input w-full" rows={5} placeholder="بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ..." style={{ fontFamily: "'Scheherazade New', 'Amiri', serif", fontSize: '1.1rem', lineHeight: '2' }} />
                  </div>
                )}

                <div><label className="ghrs-label">الوصف</label><input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ghrs-input w-full" placeholder="اختياري" /></div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ghrs-label">مكافأة XP</label><input type="number" value={formData.xp_reward} onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 0 })} min="1" className="ghrs-input w-full" /></div>
                  <div><label className="ghrs-label">مكافأة ({currencySymbol})</label><input type="number" step="0.001" value={formData.money_reward} onChange={e => setFormData({ ...formData, money_reward: parseFloat(e.target.value) || 0 })} min="0" className="ghrs-input w-full" /></div>
                </div>

                {/* Priority */}
                <div><label className="ghrs-label">الأولوية</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button key={p.value} type="button" onClick={() => setFormData({ ...formData, priority: p.value as any })}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ borderColor: formData.priority === p.value ? p.color : 'var(--ghrs-border-default)', background: formData.priority === p.value ? `${p.color}15` : 'transparent' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div><label className="ghrs-label">التكرار</label>
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
                  <div><label className="ghrs-label">اختر الأيام</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(d => (
                        <button key={d.value} type="button" onClick={() => toggleScheduleDay(d.value)}
                          className="w-10 h-10 rounded-lg text-sm font-bold transition-all"
                          style={{ background: formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                          {d.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Child Assignment */}
                {children.length > 0 && (
                  <div><label className="ghrs-label">تعيين لـ</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setFormData({ ...formData, assigned_to: [] })}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ background: formData.assigned_to.length === 0 ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.assigned_to.length === 0 ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.assigned_to.length === 0 ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                        <FamilyIcon size={12} /> الجميع
                      </button>
                      {children.map(child => (
                        <button key={child.id} type="button" onClick={() => toggleAssignedChild(child.id)}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                          <ChildIcon size={12} /> {child.name}
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

                <div className="flex gap-2 pt-1">
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
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const priority = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[1]
              const isQuran = task.task_type === 'quran'
              const isDua = task.task_type === 'dua'
              return (
                <div key={task.id} className="ghrs-card p-4 transition-all" style={{ opacity: task.is_paused ? 0.6 : 1 }}>
                  {/* Card Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: isQuran ? 'var(--ghrs-green-50)' : isDua ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)' }}>
                      {task.icon ? (() => { const Icon = getIconByName(task.icon); return <Icon size={20} color="var(--ghrs-green-600)" /> })() : isQuran ? <QuranIcon size={20} color="var(--ghrs-green-600)" /> : isDua ? <SparkleIcon size={20} color="var(--ghrs-amber-600)" /> : <TasksIcon size={20} color="var(--ghrs-text-secondary)" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{task.title}</h3>
                        {task.is_paused && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ghrs-badge ghrs-badge-neutral">موقوفة</span>}
                        {isQuran && task.quran_action_type && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ghrs-badge ghrs-badge-success">
                            {task.quran_action_type === 'memorize' ? 'حفظ' : 'قراءة'}
                          </span>
                        )}
                      </div>
                      {task.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--ghrs-text-secondary)' }}>{task.description}</p>}
                    </div>
                  </div>

                  {/* Price & Info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3 pb-3 border-t pt-3" style={{ borderColor: 'var(--ghrs-border-default)' }}>
                    <span className="inline-flex items-center gap-1 font-semibold tabular-nums" style={{ color: 'var(--ghrs-text-secondary)' }}>
                      <StarIcon size={12} /> {task.xp_reward} XP
                    </span>
                    {task.money_reward != null && task.money_reward > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums" style={{ color: 'var(--ghrs-text-secondary)' }}>
                        <CoinIcon size={12} /> {fmtMoney(task.money_reward)}
                      </span>
                    )}
                    <span style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {task.frequency === 'daily' ? 'يومي' : task.frequency === 'weekly' ? 'أسبوعي' : task.frequency === 'monthly' ? 'شهري' : task.frequency === 'once' ? 'مرة واحدة' : 'مخصص'}
                    </span>
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <span className="inline-flex items-center gap-1" style={{ color: 'var(--ghrs-text-tertiary)' }}><ChildIcon size={12} /> {task.assigned_to.map(getChildName).join(', ')}</span>
                    )}
                  </div>

                  {/* Action Buttons - Grid on mobile */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => openEdit(task)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-md text-[11px] font-bold transition-all" style={{ background: 'var(--ghrs-bg-secondary)', color: 'var(--ghrs-text-secondary)' }}>
                      <EditIcon size={12} /> تعديل
                    </button>
                    <button onClick={() => handleTogglePause(task)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-md text-[11px] font-bold transition-all"
                      style={{ background: task.is_paused ? 'var(--ghrs-green-50)' : 'var(--ghrs-amber-50)', color: task.is_paused ? 'var(--ghrs-green-700)' : 'var(--ghrs-amber-700)' }}>
                      {task.is_paused ? <><PlayIcon size={12} /> تفعيل</> : <><PauseIcon size={12} /> إيقاف</>}
                    </button>
                    <button onClick={() => setDeleteConfirm(task)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-md text-[11px] font-bold transition-all" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)' }}>
                      <DeleteIcon size={12} /> حذف
                    </button>
                  </div>

                  {/* Pending/Approved Completions */}
                  {task.completions && task.completions.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--ghrs-bg-secondary)', border: '1px solid var(--ghrs-border-default)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الإنجازات ({task.completions.length})</p>
                      <div className="space-y-1.5">
                        {task.completions.map((completion: any) => (
                          <div key={completion.id} className="p-2 rounded" style={{ background: 'var(--ghrs-bg-card)' }}>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ghrs-text-secondary)' }}>{new Date(completion.completed_at).toLocaleDateString('ar')}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ghrs-badge ${
                                completion.approved === true ? 'ghrs-badge-success'
                                : completion.approved === false ? 'ghrs-badge-error'
                                : 'ghrs-badge-warning'
                              }`}>
                                {completion.approved === true ? 'معتمد' : completion.approved === false ? 'مرفوض' : 'بانتظار'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit Form - Rendered inline when editing this task */}
                  {editingTask?.id === task.id && showAdd && (
                    <div className="mt-4 ghrs-card p-5 ghrs-animate-scale-in">
                      <h2 className="text-base font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>تعديل المهمة</h2>
                      <form onSubmit={handleSaveTask} className="space-y-3">
                        {/* Task Type Selector */}
                        <div>
                          <label className="ghrs-label">نوع المهمة</label>
                          <div className="grid grid-cols-3 gap-2">
                            {TASK_TYPES.map(tt => (
                              <button key={tt.value} type="button" onClick={() => setFormData({ ...formData, task_type: tt.value as any, surah_number: 0, from_ayah: 1, to_ayah: 1, custom_title: '', custom_content_text: '', quran_action_type: '' })}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: formData.task_type === tt.value ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.task_type === tt.value ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.task_type === tt.value ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                                {tt.icon} {tt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Title */}
                        <div>
                          <label className="ghrs-label">اسم المهمة</label>
                          <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="ghrs-input w-full" placeholder="مثال: قراءة القرآن" />
                        </div>
                        {/* Description */}
                        <div>
                          <label className="ghrs-label">الوصف</label>
                          <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ghrs-input w-full" rows={2} placeholder="وصف المهمة (اختياري)" />
                        </div>
                        {/* XP & Money */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="ghrs-label">نقاط XP</label>
                            <input type="number" min="1" value={formData.xp_reward} onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 1 })} className="ghrs-input w-full" />
                          </div>
                          <div>
                            <label className="ghrs-label">المكافأة المالية</label>
                            <input type="number" step="0.001" min="0" value={formData.money_reward} onChange={e => setFormData({ ...formData, money_reward: parseFloat(e.target.value) || 0 })} className="ghrs-input w-full" />
                          </div>
                        </div>
                        {/* Frequency */}
                        <div>
                          <label className="ghrs-label">التكرار</label>
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
                          <div><label className="ghrs-label">اختر الأيام</label>
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map(d => (
                                <button key={d.value} type="button" onClick={() => toggleScheduleDay(d.value)}
                                  className="w-10 h-10 rounded-lg text-sm font-bold transition-all"
                                  style={{ background: formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.schedule_days.includes(d.value) ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                                  {d.short}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Child Assignment */}
                        {children.length > 0 && (
                          <div><label className="ghrs-label">تعيين لـ</label>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => setFormData({ ...formData, assigned_to: [] })}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                style={{ background: formData.assigned_to.length === 0 ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.assigned_to.length === 0 ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.assigned_to.length === 0 ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                                  <FamilyIcon size={12} /> الجميع
                                </button>
                              {children.map(child => (
                                <button key={child.id} type="button" onClick={() => toggleAssignedChild(child.id)}
                                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                  style={{ background: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                                  <ChildIcon size={12} /> {child.name}
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
                        <div className="flex gap-2 pt-1">
                          <button type="submit" className="ghrs-btn-primary">حفظ التعديلات</button>
                          <button type="button" onClick={() => { setShowAdd(false); setEditingTask(null); setQuranPreview('') }} className="ghrs-btn-secondary">إلغاء</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {sortedTasks.length === 0 && <EmptyState icon={<CopyIcon size={32} />} title="لا توجد مهام" description="أضف مهاماً جديدة" action={<button onClick={openAdd} className="ghrs-btn-primary">+ إضافة مهمة</button>} />}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
