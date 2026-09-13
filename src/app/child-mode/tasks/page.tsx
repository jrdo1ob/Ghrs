'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import ParticleEffects from '@/components/ParticleEffects'
import TaskDetailsModal from '@/components/TaskDetailsModal'
import TaskCompletionFeedback from '@/components/child/TaskCompletionFeedback'
import ThemeToggle from '@/components/child/ThemeToggle'
import ChildLoading from '@/components/child/ChildLoading'
import { useSound } from '@/components/child/SoundManager'
import { ClockIcon, StarIcon, CoinIcon, CheckIcon, QuranIcon, SparkleIcon, BookIcon } from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

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
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false)
  const [completionFeedback, setCompletionFeedback] = useState<{ taskName: string; xp: number; money: number; needsApproval: boolean } | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()
  const { play } = useSound()

  useEffect(() => {
    const getData = async () => {
      const authUser = await getCurrentUser()
      if (!authUser || authUser.role !== 'child') { router.push('/family-login'); return }
      const storedId = authUser.memberId
      setChildId(storedId)

      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'tasks' }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) { router.push('/family-login'); return }

      setChildName(result.member.name)
      setTasks(result.tasks)
      setCompletedToday(result.completed_today)
      setPendingToday(result.pending_today)
      setLoading(false)
    }
    getData()
  }, [])

  const handleCompleteTask = async (taskId: string) => {
    if (!childId || completingTask) return
    setCompletingTask(taskId)

    try {
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء إنجاز المهمة' })
        setCompletingTask(null)
        play('error')
        return
      }

      const task = tasks.find(t => t.id === taskId)
      const needsApproval = task?.requires_approval !== false

      setPendingToday([...pendingToday, taskId])
      setShowTaskModal(false)

      if (!needsApproval) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2500)
        play('complete')
      } else {
        play('click')
      }

      setCompletionFeedback({
        taskName: task?.title || '',
        xp: task?.xp_reward || 0,
        money: task?.money_reward || 0,
        needsApproval,
      })
      setShowCompletionFeedback(true)
    } catch (err) {
      console.error('[GHRS] Complete task error:', err)
      setToast({ type: 'error', message: 'حدث خطأ أثناء إنجاز المهمة' })
    } finally {
      setCompletingTask(null)
    }
  }

  const openTaskModal = (task: any) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const isCompletedToday = (taskId: string) => completedToday.includes(taskId)
  const isPendingToday = (taskId: string) => pendingToday.includes(taskId)

  if (loading) {
    return <ChildLoading text="جاري تحميل المهام..." icon={<QuranIcon size={48} color="var(--ghrs-green-500)" />} />
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

      <TaskCompletionFeedback
        show={showCompletionFeedback}
        taskName={completionFeedback?.taskName || ''}
        xpEarned={completionFeedback?.xp || 0}
        moneyEarned={completionFeedback?.money || 0}
        needsApproval={completionFeedback?.needsApproval ?? true}
        onClose={() => { setShowCompletionFeedback(false); setCompletionFeedback(null) }}
        formatMoney={fmtMoney}
      />

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>مهامي</h1>
        {childName && <p className="text-sm mb-6" style={{ color: 'var(--ghrs-text-secondary)' }}>مرحباً {childName}! أكمل مهامك اليومية</p>}

        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <BookIcon size={48} />
            <p className="text-lg font-bold mt-4" style={{ color: 'var(--ghrs-text-primary)' }}>ما في مهام</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>استرح وتمتّع بيومك!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => {
              const completed = isCompletedToday(task.id)
              const pending = isPendingToday(task.id)
              const priority = PRIORITY_MAP[task.priority || 'medium'] || PRIORITY_MAP.medium
              const isQuran = task.task_type === 'quran'
              const isDua = task.task_type === 'dua'

              return (
                <div key={task.id} onClick={() => openTaskModal(task)}
                  className="rounded-2xl p-4 transition-all cursor-pointer active:scale-[0.98]"
                  style={{
                    background: 'var(--ghrs-bg-card)',
                    border: `1.5px solid var(--ghrs-border-default)`,
                    borderRight: `4px solid ${priority.color}`,
                    opacity: completed ? 0.7 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isQuran ? 'var(--ghrs-green-50)' : isDua ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)' }}>
                        {isQuran ? <QuranIcon size={20} color="var(--ghrs-green-600)" /> : isDua ? <SparkleIcon size={20} color="var(--ghrs-amber-600)" /> : <BookIcon size={20} color="var(--ghrs-text-secondary)" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate" style={{
                          color: completed ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                          textDecoration: completed ? 'line-through' : 'none'
                        }}>{task.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            <StarIcon size={10} className="inline" /> {task.xp_reward} XP
                          </span>
                          {task.money_reward > 0 && (
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                              <CoinIcon size={10} className="inline" /> {fmtMoney(task.money_reward)}
                            </span>
                          )}
                          {isQuran && task.quran_action_type && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
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
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-green-500)' }}>
                          <CheckIcon size={18} color="white" />
                        </div>
                      ) : pending ? (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-amber-500)' }}>
                          <ClockIcon size={18} color="white" />
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
