'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { Task } from '@/lib/types'
import { CopyIcon, BookIcon, ChildIcon, StarIcon, CoinIcon, PauseIcon, PlayIcon, EditIcon, DeleteIcon, ClockIcon, FamilyIcon, CheckIcon, RejectIcon } from '@/components/icons'

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

const emptyTask = {
  title: '', description: '', xp_reward: 10, money_reward: 0,
  frequency: 'daily', priority: 'medium', assigned_to: [] as string[],
  schedule_days: [] as number[], requires_approval: true,
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

  const openAdd = () => { setEditingTask(null); setFormData(emptyTask); setShowAdd(true); setError('') }
  const openEdit = (task: TaskWithCompletions) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      xp_reward: task.xp_reward,
      money_reward: task.money_reward || 0,
      frequency: task.frequency,
      priority: task.priority || 'medium',
      assigned_to: task.assigned_to || [],
      schedule_days: task.schedule_days || [],
      requires_approval: task.requires_approval,
    })
    setShowAdd(true); setError('')
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!authUser) return
    if (!formData.title.trim()) { setError('اسم المهمة مطلوب'); return }

    if (editingTask) {
      const { error: rpcError } = await supabase.rpc('update_task', {
        p_task_id: editingTask.id,
        p_title: formData.title,
        p_description: formData.description || null,
        p_xp_reward: formData.xp_reward,
        p_money_reward: formData.money_reward || null,
        p_frequency: formData.frequency,
        p_priority: formData.priority,
        p_schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : null,
        p_assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : null,
        p_requires_approval: formData.requires_approval,
      })
      if (rpcError) { setError(rpcError.message); return }

      setTasks(tasks.map(t => t.id === editingTask.id ? {
        ...t, ...formData, money_reward: formData.money_reward || null,
        frequency: formData.frequency as Task['frequency'],
        priority: formData.priority as Task['priority'],
      } : t))
      setToast({ type: 'success', message: 'تم تعديل المهمة بنجاح!' })
    } else {
      const { data: task, error: insertError } = await supabase.from('tasks').insert({
        family_id: authUser.familyId, title: formData.title,
        description: formData.description || null,
        xp_reward: formData.xp_reward, money_reward: formData.money_reward || null,
        frequency: formData.frequency, priority: formData.priority,
        assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : null,
        schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : null,
        requires_approval: formData.requires_approval,
        is_active: true, created_by: authUser.memberId,
      }).select().single()

      if (insertError) { setError(insertError.message); return }
      setTasks([{ ...task, completions: [], pendingCount: 0 } as TaskWithCompletions, ...tasks])
      setToast({ type: 'success', message: 'تم إضافة المهمة بنجاح!' })
    }
    setShowAdd(false); setEditingTask(null); setFormData(emptyTask)
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
    const { error } = await supabase.rpc('approve_task_completion', { p_completion_id: completionId, p_approved_by: authUser.memberId })
    if (error) { setToast({ type: 'error', message: 'حدث خطأ' }); return }
    setTasks(tasks.map(t => t.id === taskId ? {
      ...t, completions: t.completions.filter((c: any) => c.id !== completionId),
      pendingCount: Math.max(0, (t.pendingCount || 1) - 1)
    } : t))
    setToast({ type: 'success', message: 'تمت الموافقة!' })
  }

  const handleReject = async (completionId: string, taskId: string) => {
    if (!authUser) return
    const { error } = await supabase.rpc('reject_task_completion', { p_completion_id: completionId, p_rejected_by: authUser.memberId })
    if (error) { setToast({ type: 'error', message: 'حدث خطأ' }); return }
    setTasks(tasks.map(t => t.id === taskId ? {
      ...t, completions: t.completions.filter((c: any) => c.id !== completionId),
      pendingCount: Math.max(0, (t.pendingCount || 1) - 1)
    } : t))
    setToast({ type: 'success', message: 'تم رفض الإنجاز' })
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
        <ConfirmDialog
          show={!!deleteConfirm}
          title="حذف المهمة"
          message={`هل أنت متأكد من حذف "${deleteConfirm.title}"؟ لن تُحذف سجلات النقاط القديمة.`}
          confirmText="حذف"
          cancelText="إلغاء"
          variant="danger"
          onConfirm={handleDeleteTask}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader title="إدارة المهام" subtitle="إنشاء وتعديل وحذف المهام" backHref="/dashboard" action={
            <div className="flex gap-2">
              <Link href="/presets" className="ghrs-btn-secondary text-sm"><CopyIcon size={16} className="inline" /> بنك المهام</Link>
              <Link href="/stories" className="ghrs-btn-secondary text-sm"><BookIcon size={16} className="inline" /> القصص</Link>
              <button onClick={openAdd} className="ghrs-btn-primary">+ إضافة مهمة</button>
            </div>
          } />

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'الكل', count: tasks.length },
              { id: 'pending', label: 'بانتظار الموافقة', count: tasks.filter(t => t.pendingCount > 0).length },
              { id: 'completed', label: 'تمت الموافقة', count: tasks.filter(t => t.pendingCount === 0 && !t.is_paused).length },
              { id: 'paused', label: 'موقوفة', count: tasks.filter(t => t.is_paused).length },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap" style={{ background: activeTab === tab.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: activeTab === tab.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
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
                <div><label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم المهمة *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="ghrs-input w-full" placeholder="نظف الغرفة" /></div>
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
                        {p.emoji} {p.label}
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
<FamilyIcon size={16} className="inline" /> الجميع
                      </button>
                      {children.map(child => (
                        <button key={child.id} type="button" onClick={() => toggleAssignedChild(child.id)}
                          className="px-3 py-2 rounded-xl text-sm font-bold transition-all border-2"
                          style={{ borderColor: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)', background: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-100)' : 'transparent', color: formData.assigned_to.includes(child.id) ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                          <ChildIcon size={16} className="inline" /> {child.name}
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
                  <button type="submit" className="ghrs-btn-primary">{editingTask ? '💾 حفظ التعديلات' : '➕ إضافة'}</button>
                  <button type="button" onClick={() => { setShowAdd(false); setEditingTask(null) }} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* Task Cards */}
          <div className="space-y-4">
            {sortedTasks.map((task) => {
              const priority = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[1]
              return (
                <div key={task.id} className="ghrs-card p-5 transition-all" style={{ opacity: task.is_paused ? 0.6 : 1, borderLeft: `4px solid ${priority.color}` }}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{priority.emoji}</span>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{task.title}</h3>
                        {task.is_paused && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-tertiary)' }}><PauseIcon size={16} className="inline" /> موقوفة</span>}
                      </div>
                      {task.description && <p className="text-sm mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>{task.description}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <span className="font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}><StarIcon size={16} className="inline" /> {task.xp_reward} XP</span>
                        {task.money_reward != null && task.money_reward > 0 && <span className="font-semibold" style={{ color: 'var(--ghrs-green-600)' }}><CoinIcon size={16} className="inline" /> {fmtMoney(task.money_reward)}</span>}
                        <span style={{ color: 'var(--ghrs-text-tertiary)' }}>
                          {task.frequency === 'daily' ? 'يومي' : task.frequency === 'weekly' ? 'أسبوعي' : task.frequency === 'monthly' ? 'شهري' : task.frequency === 'once' ? 'مرة واحدة' : 'مخصص'}
                        </span>
                        {task.assigned_to && task.assigned_to.length > 0 && (
                          <span style={{ color: 'var(--ghrs-text-tertiary)' }}><ChildIcon size={16} className="inline" /> {task.assigned_to.map(getChildName).join(', ')}</span>
                        )}
                        {!task.assigned_to && <span style={{ color: 'var(--ghrs-text-tertiary)' }}><FamilyIcon size={16} className="inline" /> الجميع</span>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(task)} title="تعديل" className="p-2 rounded-lg transition-all hover:bg-ghrs-bg-tertiary" style={{ color: 'var(--ghrs-blue-500)' }}><EditIcon size={16} className="inline" /></button>
                      <button onClick={() => handleTogglePause(task)} title={task.is_paused ? 'تفعيل' : 'إيقاف'} className="p-2 rounded-lg transition-all hover:bg-ghrs-bg-tertiary" style={{ color: task.is_paused ? 'var(--ghrs-green-500)' : 'var(--ghrs-amber-500)' }}>{task.is_paused ? <PlayIcon size={16} className="inline" /> : <PauseIcon size={16} className="inline" />}</button>
                      <button onClick={() => setDeleteConfirm(task)} title="حذف" className="p-2 rounded-lg transition-all hover:bg-ghrs-bg-tertiary" style={{ color: 'var(--ghrs-red-500)' }}><DeleteIcon size={16} className="inline" /></button>
                    </div>
                  </div>

                  {/* Pending Completions */}
                  {task.completions && task.completions.length > 0 && (
                    <div className="mt-3 p-4 rounded-xl" style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}>
                      <p className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-amber-700)' }}><ClockIcon size={16} className="inline" /> بانتظار الموافقة ({task.completions.length})</p>
                      <div className="space-y-2">
                        {task.completions.map((completion: any) => (
                          <div key={completion.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--ghrs-bg-card)' }}>
                            <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-primary)' }}>{new Date(completion.completed_at).toLocaleDateString('ar')}</p>
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(completion.id, task.id)} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-green-500)', color: 'white' }}><CheckIcon size={16} className="inline" /> موافقة</button>
                              <button onClick={() => handleReject(completion.id, task.id)} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-red-500)', color: 'white' }}><RejectIcon size={16} className="inline" /> رفض</button>
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
