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
import { ClockIcon, StarIcon, CoinIcon, CheckIcon, QuranIcon, SparkleIcon, BookIcon, TasksIcon } from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

const PRIORITY_MAP: Record<string, { color: string; label: string; bg: string; border: string }> = {
  high: { color: 'var(--ghrs-red-500)', label: 'عالية', bg: 'var(--ghrs-red-50)', border: 'var(--ghrs-red-200)' },
  medium: { color: 'var(--ghrs-amber-500)', label: 'متوسطة', bg: 'var(--ghrs-amber-50)', border: 'var(--ghrs-amber-200)' },
  low: { color: 'var(--ghrs-green-500)', label: 'منخفضة', bg: 'var(--ghrs-green-50)', border: 'var(--ghrs-green-200)' },
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
    return <ChildLoading text="جاري تحميل المهام..." icon={<TasksIcon size={48} color="var(--ghrs-green-500)" />} />
  }

  const completedCount = completedToday.length
  const pendingCount = pendingToday.length

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

      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        <div className="flex justify-end mb-3">
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--ghrs-text-primary)' }}>مهامي</h1>
          {childName && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--ghrs-text-secondary)' }}>
              مرحباً {childName}! أكمل مهامك اليومية
            </p>
          )}
        </div>

        {tasks.length === 0 ? (
          <div
            className="text-center py-16 rounded-3xl"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
            }}
          >
            <div className="text-4xl mb-3 ghrs-animate-float">🌿</div>
            <p className="text-base font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>ما في مهام</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>استرح وتمتّع بيومك!</p>
          </div>
        ) : (
          <>
            {/* Progress summary */}
            <div
              className="mb-5 rounded-2xl p-4"
              style={{
                background: 'var(--ghrs-bg-card)',
                border: '1.5px solid var(--ghrs-border-default)',
                boxShadow: 'var(--ghrs-shadow-sm)',
              }}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <CheckIcon size={14} color="var(--ghrs-green-600)" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{completedCount} مكتملة</span>
                </div>
                <div className="w-px h-3" style={{ background: 'var(--ghrs-border-default)' }} />
                <div className="flex items-center gap-1.5">
                  <ClockIcon size={14} color="var(--ghrs-amber-600)" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{pendingCount} بانتظار</span>
                </div>
                <div className="flex-1" />
                <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                  {tasks.length} المجموع
                </span>
              </div>
              <div className="ghrs-progress-bar" style={{ height: '6px' }}>
                <div
                  className="ghrs-progress-fill"
                  style={{ width: `${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Task cards */}
            <div className="space-y-3">
              {tasks.map(task => {
                const completed = isCompletedToday(task.id)
                const pending = isPendingToday(task.id)
                const priority = PRIORITY_MAP[task.priority || 'medium'] || PRIORITY_MAP.medium
                const isQuran = task.task_type === 'quran'
                const isDua = task.task_type === 'dua'

                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskModal(task)}
                    className="ghrs-child-task-card cursor-pointer active:scale-[0.98]"
                    data-priority={task.priority || 'medium'}
                    style={{ opacity: completed ? 0.65 : 1 }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: isQuran ? 'var(--ghrs-green-50)' : isDua ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-secondary)',
                          border: `1px solid ${isQuran ? 'var(--ghrs-green-200)' : isDua ? 'var(--ghrs-amber-200)' : 'var(--ghrs-border-default)'}`,
                        }}
                      >
                        {isQuran ? <QuranIcon size={18} color="var(--ghrs-green-600)" /> : isDua ? <SparkleIcon size={18} color="var(--ghrs-amber-600)" /> : <BookIcon size={18} color="var(--ghrs-text-tertiary)" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-sm font-bold leading-snug"
                          style={{
                            color: completed ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                            textDecoration: completed ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </h3>

                        {/* Rewards row */}
                        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{ background: 'var(--ghrs-amber-50)', color: 'var(--ghrs-amber-700)', border: '1px solid var(--ghrs-amber-200)' }}
                          >
                            <StarIcon size={10} color="var(--ghrs-amber-600)" /> {task.xp_reward} XP
                          </span>
                          {task.money_reward > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)', border: '1px solid var(--ghrs-green-200)' }}
                            >
                              <CoinIcon size={10} color="var(--ghrs-green-600)" /> {fmtMoney(task.money_reward)}
                            </span>
                          )}
                          {isQuran && task.quran_action_type && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: 'var(--ghrs-green-100)', color: 'var(--ghrs-green-700)' }}
                            >
                              {task.quran_action_type === 'memorize' ? 'حفظ' : 'قراءة'}
                            </span>
                          )}
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.border}` }}
                          >
                            {priority.label}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0 mt-0.5">
                        {completed ? (
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--ghrs-green-500)' }}
                          >
                            <CheckIcon size={16} color="white" />
                          </div>
                        ) : pending ? (
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--ghrs-amber-500)' }}
                          >
                            <ClockIcon size={16} color="white" />
                          </div>
                        ) : (
                          <div
                            className="px-3 py-2 rounded-xl text-[10px] font-bold"
                            style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)', border: '1px solid var(--ghrs-green-200)' }}
                          >
                            اضغط للتفاصيل
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ChildBottomNav />
    </div>
  )
}
