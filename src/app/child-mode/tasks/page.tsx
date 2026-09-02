'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import ParticleEffects from '@/components/ParticleEffects'
import TaskDetailsModal from '@/components/TaskDetailsModal'
import { ClockIcon, StarIcon, CoinIcon, CheckIcon, CopyIcon, QuranIcon, SparkleIcon, BookIcon } from '@/components/icons'

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  high: { color: 'var(--ghrs-red-500)', label: 'عالية' },
  medium: { color: 'var(--ghrs-amber-500)', label: 'متوسطة' },
  low: { color: 'var(--ghrs-green-500)', label: 'منخفضة' },
}

export default function ChildTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completedToday, setCompletedToday] = useState<string[]>([])
  const [pendingToday, setPendingToday] = useState<string[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [completingTask, setCompletingTask] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [childId, setChildId] = useState<string | null>(null)
  const [childName, setChildName] = useState('')
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney } = useFamilyCurrency()

  useEffect(() => {
    const getData = async () => {
      const storedId = localStorage.getItem('child_id')
      if (!storedId) { router.push('/family-login'); return }
      setChildId(storedId)

      const { data: memberData } = await supabase.from('members').select('*').eq('id', storedId).single()
      if (!memberData || memberData.role !== 'child') { router.push('/family-login'); return }
      setChildName(memberData.name)

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', memberData.family_id)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('is_paused', false)
        .or(`assigned_to.is.null,assigned_to.cs.{${storedId}}`)

      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const sorted = (tasksData || []).sort((a, b) => (priorityOrder[a.priority || 'medium'] || 1) - (priorityOrder[b.priority || 'medium'] || 1))
      setTasks(sorted)

      const today = new Date().toISOString().split('T')[0]
      const { data: completions } = await supabase
        .from('task_completions')
        .select('task_id, approved')
        .eq('member_id', storedId)
        .gte('completed_at', today)

      setCompletedToday(completions?.filter(c => c.approved === true).map(c => c.task_id) || [])
      setPendingToday(completions?.filter(c => c.approved === null || c.approved === false).map(c => c.task_id) || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleCompleteTask = async (taskId: string) => {
    if (!childId || completingTask) return
    setCompletingTask(taskId)

    console.log('[GHRS] Completing task:', taskId, 'for child:', childId)
    const { data, error } = await supabase.rpc('complete_task_with_rewards', { p_task_id: taskId, p_member_id: childId })
    
    if (error) {
      console.error('[GHRS] Complete task error:', error.message, error)
      setToast({ type: 'error', message: 'حدث خطأ أثناء إنجاز المهمة: ' + error.message })
      setCompletingTask(null); return
    }

    console.log('[GHRS] Task completed successfully')
    const task = tasks.find(t => t.id === taskId)
    const needsApproval = task?.requires_approval !== false

    setPendingToday([...pendingToday, taskId])
    setCompletingTask(null)
    setShowTaskModal(false)

    if (!needsApproval) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2500)
    }

    setToast({
      type: 'success',
      message: needsApproval ? 'تم إنجاز المهمة! بانتظار موافقة الوالد' : 'تم إنجاز المهمة وحصلت على المكافآت!'
    })
  }

  const openTaskModal = (task: any) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const isCompletedToday = (taskId: string) => completedToday.includes(taskId)
  const isPendingToday = (taskId: string) => pendingToday.includes(taskId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <QuranIcon size={64} color="var(--ghrs-green-500)" className="mx-auto mb-4 ghrs-animate-float" />
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ParticleEffects active={showConfetti} />
      
      <TaskDetailsModal
        show={showTaskModal}
        task={selectedTask}
        onClose={() => { setShowTaskModal(false); setSelectedTask(null) }}
        onComplete={handleCompleteTask}
        isCompleted={selectedTask ? isCompletedToday(selectedTask.id) : false}
        isPending={selectedTask ? isPendingToday(selectedTask.id) : false}
        completingTask={completingTask}
        formatMoney={fmtMoney}
      />

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
              document.documentElement.setAttribute('data-theme', newTheme)
              localStorage.setItem('ghrs-theme', newTheme)
            }}
            className="p-3 rounded-xl transition-all"
            style={{ background: 'var(--ghrs-bg-card)', border: '2px solid var(--ghrs-border-default)' }}
            aria-label="تبديل المظهر"
          >
            {document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ghrs-text-primary)' }}>مهامي</h1>
        {childName && <p className="text-sm mb-6" style={{ color: 'var(--ghrs-text-secondary)' }}>مرحباً {childName}! أكمل مهامك اليومية</p>}

        {tasks.length === 0 ? (
          <EmptyState icon={<CopyIcon size={48} />} title="ما في مهام" description="استرح وتمتّع بيومك!" />
        ) : (
          <div className="space-y-3">
            {tasks.map(task => {
              const completed = isCompletedToday(task.id)
              const pending = isPendingToday(task.id)
              const priority = PRIORITY_MAP[task.priority || 'medium'] || PRIORITY_MAP.medium
              const isQuran = task.task_type === 'quran'
              const isDua = task.task_type === 'dua'
              const hasContent = isQuran || isDua || task.story_content || task.custom_content_text

              return (
                <div key={task.id} onClick={() => openTaskModal(task)}
                  className="ghrs-card p-5 transition-all cursor-pointer active:scale-[0.98]"
                  style={{
                    borderRight: `4px solid ${priority.color}`,
                    opacity: completed ? 0.7 : 1,
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: isQuran ? 'var(--ghrs-green-50)' : isDua ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)' }}>
                        {isQuran ? <QuranIcon size={24} color="var(--ghrs-green-600)" /> : isDua ? <SparkleIcon size={24} color="var(--ghrs-amber-600)" /> : <BookIcon size={24} color="var(--ghrs-text-secondary)" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold" style={{
                          color: completed ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                          textDecoration: completed ? 'line-through' : 'none'
                        }}>{task.title}</h3>
                        {task.description && <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>{task.description}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            <StarIcon size={14} className="inline" /> {task.xp_reward} XP
                          </span>
                          {task.money_reward > 0 && (
                            <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                              <CoinIcon size={14} className="inline" /> {fmtMoney(task.money_reward)}
                            </span>
                          )}
                          {isQuran && task.quran_action_type && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                              background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)'
                            }}>
                              {task.quran_action_type === 'memorize' ? 'حفظ' : 'قراءة'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {completed ? (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--ghrs-green-500)' }}>
                          <CheckIcon size={20} color="white" />
                        </div>
                      ) : pending ? (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--ghrs-amber-500)' }}>
                          <ClockIcon size={20} color="white" />
                        </div>
                      ) : (
                        <div className="text-xs font-bold px-3 py-2 rounded-xl" style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)' }}>
                          اضغط للتفاصيل
                        </div>
                      )}
                    </div>
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
