'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'

interface TaskWithCompletions {
  id: string
  family_id: string
  title: string
  description: string | null
  assigned_to: string[] | null
  frequency: string
  xp_reward: number
  money_reward: number | null
  requires_approval: boolean
  is_active: boolean
  created_by: string
  created_at: string
  completions?: any[]
  pendingCount?: number
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', xp_reward: 10, money_reward: 0, frequency: 'daily' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/owner-login')
        return
      }

      const { data: identity } = await supabase
        .from('auth_identities')
        .select('member_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!identity) {
        router.push('/family-setup')
        return
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('family_id')
        .eq('id', identity.member_id)
        .single()

      if (!memberData) return

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', memberData.family_id)
        .order('created_at', { ascending: false })

      // Get pending completions for each task
      const tasksWithCompletions = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: completions } = await supabase
            .from('task_completions')
            .select('*')
            .eq('task_id', task.id)
            .eq('approved', false)

          return {
            ...task,
            completions: completions || [],
            pendingCount: completions?.length || 0
          }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: identity } = await supabase
      .from('auth_identities')
      .select('member_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!identity) return

    const { data: memberData } = await supabase
      .from('members')
      .select('family_id')
      .eq('id', identity.member_id)
      .single()

    if (!memberData) return

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        family_id: memberData.family_id,
        title: newTask.title,
        description: newTask.description || null,
        xp_reward: newTask.xp_reward,
        money_reward: newTask.money_reward || null,
        frequency: newTask.frequency,
        requires_approval: true,
        is_active: true,
        created_by: identity.member_id,
      })
      .select()
      .single()

    if (taskError) {
      setError(taskError.message)
      return
    }

    setTasks([{ ...task, completions: [], pendingCount: 0 }, ...tasks])
    setShowAdd(false)
    setNewTask({ title: '', description: '', xp_reward: 10, money_reward: 0, frequency: 'daily' })
    setToast({ type: 'success', message: 'تم إضافة المهمة بنجاح!' })
  }

  const handleApproveCompletion = async (completionId: string, taskId: string) => {
    const { error } = await supabase
      .from('task_completions')
      .update({ 
        approved: true, 
        approved_at: new Date().toISOString() 
      })
      .eq('id', completionId)

    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ أثناء الموافقة' })
      return
    }

    // Update XP and money
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const completion = task.completions?.find((c: any) => c.id === completionId)
      if (completion) {
        // Add XP
        await supabase.from('xp_transactions').insert({
          member_id: completion.member_id,
          amount: task.xp_reward,
          source: 'task_completion',
          source_id: completionId,
          description: `إنجاز: ${task.title}`
        })

        // Add money if applicable
        if (task.money_reward && task.money_reward > 0) {
          await supabase.from('money_transactions').insert({
            member_id: completion.member_id,
            amount: task.money_reward,
            type: 'earned',
            source: 'task_completion',
            source_id: completionId,
            status: 'pending',
            description: `مكافأة: ${task.title}`
          })
        }
      }
    }

    // Update local state
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completions: t.completions?.filter((c: any) => c.id !== completionId) || [],
          pendingCount: (t.pendingCount || 1) - 1
        }
      }
      return t
    }))

    setToast({ type: 'success', message: 'تمت الموافقة على الإنجاز! ⭐' })
  }

  const handleRejectCompletion = async (completionId: string, taskId: string) => {
    const { error } = await supabase
      .from('task_completions')
      .delete()
      .eq('id', completionId)

    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ أثناء الرفض' })
      return
    }

    // Update local state
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completions: t.completions?.filter((c: any) => c.id !== completionId) || [],
          pendingCount: (t.pendingCount || 1) - 1
        }
      }
      return t
    }))

    setToast({ type: 'success', message: 'تم رفض الإنجاز' })
  }

  const handleToggleActive = async (taskId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_active: !currentActive })
      .eq('id', taskId)

    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ' })
      return
    }

    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, is_active: !currentActive } : t
    ))
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
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      <ParentSidebar />

      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader 
            title="إدارة المهام"
            subtitle="إنشاء وتعديل المهام والعادات"
            backHref="/dashboard"
            action={
              <button
                onClick={() => setShowAdd(true)}
                className="ghrs-btn-primary"
              >
                + إضافة مهمة
              </button>
            }
          />

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'الكل', count: tasks.length },
              { id: 'pending', label: 'بانتظار الموافقة', count: tasks.filter(t => t.pendingCount > 0).length },
              { id: 'completed', label: 'تمت الموافقة', count: tasks.filter(t => t.pendingCount === 0).length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={{
                  background: activeTab === tab.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)',
                  color: activeTab === tab.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)',
                  border: `1px solid ${activeTab === tab.id ? 'var(--ghrs-green-200)' : 'transparent'}`
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
              {error}
            </div>
          )}

          {/* Add Task Form */}
          {showAdd && (
            <div className="ghrs-card p-6 mb-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>مهمة جديدة</h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم المهمة</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    className="ghrs-input"
                    placeholder="نظف الغرفة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الوصف (اختياري)</label>
                  <input
                    type="text"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="ghrs-input"
                    placeholder="نظف الغرفة ورتب الأشياء"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>مكافأة XP</label>
                    <input
                      type="number"
                      value={newTask.xp_reward}
                      onChange={(e) => setNewTask({ ...newTask, xp_reward: parseInt(e.target.value) })}
                      required
                      min="1"
                      className="ghrs-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>مكافأة مالية (اختياري)</label>
                    <input
                      type="number"
                      value={newTask.money_reward}
                      onChange={(e) => setNewTask({ ...newTask, money_reward: parseInt(e.target.value) })}
                      min="0"
                      className="ghrs-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>التكرار</label>
                  <select
                    value={newTask.frequency}
                    onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                    className="ghrs-input"
                  >
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="custom">مخصص</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="ghrs-btn-primary">إضافة</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="ghrs-card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{task.title}</h3>
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ 
                          background: task.is_active ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)',
                          color: task.is_active ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-tertiary)'
                        }}
                      >
                        {task.is_active ? 'نشطة' : 'غير نشطة'}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{task.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>⭐ {task.xp_reward} XP</span>
                      {task.money_reward > 0 && (
                        <span className="font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>💰 {task.money_reward}</span>
                      )}
                      <span style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        {task.frequency === 'daily' ? 'يومي' :
                         task.frequency === 'weekly' ? 'أسبوعي' :
                         task.frequency === 'monthly' ? 'شهري' : 'مخصص'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(task.id, task.is_active)}
                      className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                      style={{
                        background: task.is_active ? 'var(--ghrs-amber-50)' : 'var(--ghrs-green-50)',
                        color: task.is_active ? 'var(--ghrs-amber-700)' : 'var(--ghrs-green-700)'
                      }}
                    >
                      {task.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                    </button>
                  </div>
                </div>

                {/* Pending Completions */}
                {task.completions && task.completions.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}>
                    <p className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-amber-700)' }}>
                      ⏳ بانتظار الموافقة ({task.completions.length})
                    </p>
                    <div className="space-y-2">
                      {task.completions.map((completion: any) => (
                        <div key={completion.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--ghrs-bg-card)' }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-primary)' }}>
                              {new Date(completion.completed_at).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveCompletion(completion.id, task.id)}
                              className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                              style={{ background: 'var(--ghrs-green-500)', color: 'white' }}
                            >
                              ✓ موافقة
                            </button>
                            <button
                              onClick={() => handleRejectCompletion(completion.id, task.id)}
                              className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                              style={{ background: 'var(--ghrs-red-500)', color: 'white' }}
                            >
                              ✕ رفض
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <EmptyState
              icon="📋"
              title={activeTab === 'all' ? 'لم تتم إضافة أي مهام بعد' : activeTab === 'pending' ? 'لا توجد مهام بانتظار الموافقة' : 'لا توجد مهام تمت موافقتها'}
              description="أضف مهاماً جديدة لبدء رحلة النمو"
              action={
                <button onClick={() => setShowAdd(true)} className="ghrs-btn-primary">
                  + إضافة مهمة
                </button>
              }
            />
          )}
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
