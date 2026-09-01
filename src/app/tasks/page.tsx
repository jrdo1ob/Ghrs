'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'

export default function TasksPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', xp_reward: 10, money_reward: 0, frequency: 'daily' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all')
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney, symbol: currencySymbol } = useFamilyCurrency()

  useEffect(() => {
    const getTasks = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }

      setAuthUser(user)

      const { data: tasksData } = await supabase
        .from('tasks').select('*').eq('family_id', user.familyId).order('created_at', { ascending: false })

      const tasksWithCompletions = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: completions } = await supabase
            .from('task_completions').select('*').eq('task_id', task.id).eq('approved', false)
          return { ...task, completions: completions || [], pendingCount: completions?.length || 0 }
        })
      )

      setTasks(tasksWithCompletions)
      setLoading(false)
    }

    getTasks()
  }, [])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!authUser) return

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        family_id: authUser.familyId, title: newTask.title, description: newTask.description || null,
        xp_reward: newTask.xp_reward, money_reward: newTask.money_reward || null, frequency: newTask.frequency,
        requires_approval: true, is_active: true, created_by: authUser.memberId,
      })
      .select().single()

    if (taskError) { setError(taskError.message); return }

    setTasks([{ ...task, completions: [], pendingCount: 0 }, ...tasks])
    setShowAdd(false)
    setNewTask({ title: '', description: '', xp_reward: 10, money_reward: 0, frequency: 'daily' })
    setToast({ type: 'success', message: 'تم إضافة المهمة بنجاح!' })
  }

  const handleApproveCompletion = async (completionId: string, taskId: string) => {
    if (!authUser) return

    const { error } = await supabase.rpc('approve_task_completion', {
      p_completion_id: completionId,
      p_approved_by: authUser.memberId
    })

    if (error) { setToast({ type: 'error', message: 'حدث خطأ' }); return }

    setTasks(tasks.map(t => t.id === taskId ? { ...t, completions: t.completions?.filter((c: any) => c.id !== completionId) || [], pendingCount: (t.pendingCount || 1) - 1 } : t))
    setToast({ type: 'success', message: 'تمت الموافقة! ⭐' })
  }

  const handleRejectCompletion = async (completionId: string, taskId: string) => {
    const authUser = await getCurrentUser()
    if (!authUser) return

    const { data, error } = await supabase.rpc('reject_task_completion', {
      p_completion_id: completionId,
      p_rejected_by: authUser.memberId
    })

    if (error || !data?.success) { 
      setToast({ type: 'error', message: data?.message || 'حدث خطأ' }); return 
    }
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completions: t.completions?.filter((c: any) => c.id !== completionId) || [], pendingCount: (t.pendingCount || 1) - 1 } : t))
    setToast({ type: 'success', message: 'تم رفض الإنجاز' })
  }

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'pending') return task.pendingCount > 0
    if (activeTab === 'completed') return task.pendingCount === 0
    return true
  })

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
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader title="إدارة المهام" subtitle="إنشاء وتعديل المهام" backHref="/dashboard" action={
            <div className="flex gap-2">
              <Link href="/presets" className="ghrs-btn-secondary text-sm">📋 بنك المهام</Link>
              <button onClick={() => setShowAdd(true)} className="ghrs-btn-primary">+ إضافة مهمة</button>
            </div>
          } />

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[{ id: 'all', label: 'الكل', count: tasks.length }, { id: 'pending', label: 'بانتظار الموافقة', count: tasks.filter(t => t.pendingCount > 0).length }, { id: 'completed', label: 'تمت الموافقة', count: tasks.filter(t => t.pendingCount === 0).length }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap" style={{ background: activeTab === tab.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: activeTab === tab.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {error && <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)' }}>{error}</div>}

          {showAdd && (
            <div className="ghrs-card p-6 mb-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>مهمة جديدة</h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div><label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم المهمة</label><input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required className="ghrs-input" placeholder="نظف الغرفة" /></div>
                <div><label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الوصف</label><input type="text" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="ghrs-input" placeholder="اختياري" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>مكافأة XP</label><input type="number" value={newTask.xp_reward} onChange={(e) => setNewTask({ ...newTask, xp_reward: parseInt(e.target.value) })} required min="1" className="ghrs-input" /></div>
                  <div><label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>مكافأة مالية ({currencySymbol})</label><input type="number" value={newTask.money_reward} onChange={(e) => setNewTask({ ...newTask, money_reward: parseInt(e.target.value) })} min="0" className="ghrs-input" /></div>
                </div>
                <div><label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>التكرار</label><select value={newTask.frequency} onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })} className="ghrs-input"><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option></select></div>
                <div className="flex gap-2"><button type="submit" className="ghrs-btn-primary">إضافة</button><button type="button" onClick={() => setShowAdd(false)} className="ghrs-btn-secondary">إلغاء</button></div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="ghrs-card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{task.title}</h3>
                    {task.description && <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{task.description}</p>}
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>⭐ {task.xp_reward} XP</span>
                      {task.money_reward > 0 && <span className="font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>💰 {fmtMoney(task.money_reward)}</span>}
                      <span style={{ color: 'var(--ghrs-text-tertiary)' }}>{task.frequency === 'daily' ? 'يومي' : task.frequency === 'weekly' ? 'أسبوعي' : 'شهري'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: task.is_active ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)', color: task.is_active ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-tertiary)' }}>{task.is_active ? 'نشطة' : 'غير نشطة'}</span>
                </div>
                {task.completions && task.completions.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}>
                    <p className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-amber-700)' }}>⏳ بانتظار الموافقة ({task.completions.length})</p>
                    <div className="space-y-2">
                      {task.completions.map((completion: any) => (
                        <div key={completion.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--ghrs-bg-card)' }}>
                          <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-primary)' }}>{new Date(completion.completed_at).toLocaleDateString('ar-EG')}</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleApproveCompletion(completion.id, task.id)} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-green-500)', color: 'white' }}>✓ موافقة</button>
                            <button onClick={() => handleRejectCompletion(completion.id, task.id)} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-red-500)', color: 'white' }}>✕ رفض</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && <EmptyState icon="📋" title="لا توجد مهام" description="أضف مهاماً جديدة" action={<button onClick={() => setShowAdd(true)} className="ghrs-btn-primary">+ إضافة مهمة</button>} />}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
