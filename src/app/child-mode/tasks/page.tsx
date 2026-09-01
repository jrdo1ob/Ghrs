'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'

export default function ChildTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completedToday, setCompletedToday] = useState<string[]>([])
  const [pendingToday, setPendingToday] = useState<string[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [completingTask, setCompletingTask] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney } = useFamilyCurrency()

  useEffect(() => {
    const getData = async () => {
      const childId = localStorage.getItem('child_id')
      if (!childId) {
        router.push('/family-login')
        return
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', childId)
        .single()

      if (!memberData || memberData.role !== 'child') {
        router.push('/family-login')
        return
      }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', memberData.family_id)
        .eq('is_active', true)

      setTasks(tasksData || [])

      const today = new Date().toISOString().split('T')[0]
      const { data: completions } = await supabase
        .from('task_completions')
        .select('task_id, approved')
        .eq('member_id', childId)
        .gte('completed_at', today)

      const completedIds = completions?.filter(c => c.approved).map(c => c.task_id) || []
      const pendingIds = completions?.filter(c => !c.approved).map(c => c.task_id) || []

      setCompletedToday(completedIds)
      setPendingToday(pendingIds)
      setLoading(false)
    }

    getData()
  }, [])

  const handleCompleteTask = async (taskId: string) => {
    const childId = localStorage.getItem('child_id')
    if (!childId || completingTask) return

    setCompletingTask(taskId)

    const { error } = await supabase.rpc('complete_task_with_rewards', {
      p_task_id: taskId,
      p_member_id: childId
    })

    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ أثناء إنجاز المهمة' })
      setCompletingTask(null)
      return
    }

    const task = tasks.find(t => t.id === taskId)
    const needsApproval = task?.requires_approval !== false

    setPendingToday([...pendingToday, taskId])
    setCompletingTask(null)
    setToast({ 
      type: 'success', 
      message: needsApproval 
        ? 'تم إنجاز المهمة! بانتظار موافقة الوالد ⏳' 
        : 'تم إنجاز المهمة وحصلت على المكافآت! 🎉' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🌱</div>
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
        </div>
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

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ghrs-text-primary)' }}>📋 مهامي</h1>

        {tasks.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="ما في مهام"
            description="استرح وتمتّع بيومك!"
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = completedToday.includes(task.id)
              const isPending = pendingToday.includes(task.id)

              return (
                <div
                  key={task.id}
                  className="ghrs-card p-4 transition-all"
                  style={{
                    border: `1px solid ${isCompleted ? 'var(--ghrs-green-200)' : isPending ? 'var(--ghrs-amber-200)' : 'var(--ghrs-border-default)'}`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold" style={{
                        color: isCompleted ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                          ⭐ {task.xp_reward} XP
                        </span>
                        {task.money_reward > 0 && (
                          <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                            💰 {fmtMoney(task.money_reward)}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                          {task.frequency === 'daily' ? 'يومي' : task.frequency === 'weekly' ? 'أسبوعي' : task.frequency === 'monthly' ? 'شهري' : 'مخصص'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={isCompleted || isPending || completingTask === task.id}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: isCompleted ? 'var(--ghrs-green-500)' : isPending ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)',
                        color: 'white',
                        opacity: isCompleted || isPending || completingTask === task.id ? 0.8 : 1
                      }}
                    >
                      {isCompleted ? '✓ تم' : isPending ? '⏳ بانتظار' : completingTask === task.id ? '⏳ جاري...' : 'أنجزت!'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ChildBottomNav />
    </div>
  )
}
