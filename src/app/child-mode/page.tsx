'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChildBottomNav, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { getLevel, getNextLevel, Level } from '@/lib/gamification'
import CelebrationModal from '@/components/CelebrationModal'
import ParticleEffects from '@/components/ParticleEffects'
import TaskCompletionFeedback from '@/components/child/TaskCompletionFeedback'
import ThemeToggle from '@/components/child/ThemeToggle'
import ChildLoading from '@/components/child/ChildLoading'
import { useSound } from '@/components/child/SoundManager'
import { StarIcon, CoinIcon, ClockIcon, CheckIcon, GiftsIcon, TasksIcon, GardenIcon, FireIcon, SparkleIcon, LeafIcon } from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

export default function ChildModePage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [xp, setXp] = useState(0)
  const [completedToday, setCompletedToday] = useState<string[]>([])
  const [pendingToday, setPendingToday] = useState<string[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [streak, setStreak] = useState(0)
  const [moneyBalance, setMoneyBalance] = useState(0)
  const [completingTask, setCompletingTask] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationLevel, setCelebrationLevel] = useState<Level | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false)
  const [completionFeedback, setCompletionFeedback] = useState<{ taskName: string; xp: number; money: number; needsApproval: boolean } | null>(null)
  const prevLevelRef = useRef<Level | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()
  const { play } = useSound()

  useEffect(() => {
    const getData = async () => {
      const authUser = await getCurrentUser()
      if (!authUser || authUser.role !== 'child') {
        router.push('/family-login')
        return
      }

      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'home' }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        router.push('/family-login')
        return
      }

      setMember(result.member)
      setStreak(result.member.current_streak || 0)
      setTasks(result.tasks)
      setXp(result.xp)
      setMoneyBalance(result.money_balance)
      setCompletedToday(result.completed_today)
      setPendingToday(result.pending_today)

      if (result.recent_manual) {
        setTimeout(() => {
          setToast({ type: result.recent_manual.type, message: result.recent_manual.message })
        }, 1500)
      }

      setLoading(false)
    }

    getData()
  }, [])

  const level = getLevel(xp)
  const nextLevel = getNextLevel(level)
  const progressToNext = nextLevel
    ? ((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100
    : 100

  useEffect(() => {
    if (prevLevelRef.current && level.level > prevLevelRef.current.level) {
      setCelebrationLevel(level)
      setShowCelebration(true)
      play('levelup')
    }
    prevLevelRef.current = level
  }, [level, play])

  const handleCompleteTask = async (taskId: string) => {
    const authUser = await getCurrentUser()
    if (!authUser || authUser.role !== 'child' || completingTask) return

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

  if (loading) {
    return <ChildLoading text="جاري التحميل..." />
  }

  const totalTasks = tasks.length
  const completedCount = completedToday.length
  const pendingCount = pendingToday.length

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <CelebrationModal
        show={showCelebration}
        level={celebrationLevel?.level || 1}
        levelName={celebrationLevel?.name || ''}
        levelEmoji={celebrationLevel?.emoji || '🌱'}
        onClose={() => setShowCelebration(false)}
      />

      <ParticleEffects active={showConfetti} />

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
        {/* Top bar: theme toggle */}
        <div className="flex justify-end mb-3">
          <ThemeToggle />
        </div>

        {/* === Growth Hero === */}
        <div
          className="mb-5 rounded-3xl p-6 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(170deg, var(--ghrs-green-50) 0%, var(--ghrs-bg-card) 70%)',
            border: '1.5px solid var(--ghrs-green-200)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          <div className="absolute top-3 right-5 opacity-10"><SparkleIcon size={18} /></div>
          <div className="absolute top-6 left-6 opacity-[0.07]"><LeafIcon size={14} /></div>

          <div className="relative">
            {/* Plant */}
            <div
              className={`mb-3 ${level.plantSize} transition-transform duration-500`}
              style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.08))' }}
            >
              {level.emoji}
            </div>

            {/* Welcome */}
            <h1 className="text-xl font-extrabold mb-0.5" style={{ color: 'var(--ghrs-text-primary)' }}>
              مرحباً {member?.name}!
            </h1>
            <p className="text-xs mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              اليوم يوم جديد للنمو
            </p>

            {/* Level badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{
                background: 'var(--ghrs-green-100)',
                border: '1.5px solid var(--ghrs-green-200)',
              }}
            >
              <span className="text-base">{level.emoji}</span>
              <span className="text-xs font-bold" style={{ color: 'var(--ghrs-green-700)' }}>
                المستوى {level.level}: {level.name}
              </span>
            </div>

            {/* XP progress */}
            {nextLevel && (
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                    التقدم للمستوى التالي
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                    {xp} / {nextLevel.minXp} XP
                  </span>
                </div>
                <div className="ghrs-progress-bar" style={{ height: '7px' }}>
                  <div
                    className="ghrs-progress-fill"
                    style={{ width: `${Math.min(100, progressToNext)}%` }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                  {nextLevel.minXp - xp} نقطة للوصول إلى {nextLevel.name} {nextLevel.emoji}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* === Balance + Streak Row === */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* XP */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}
            >
              <StarIcon size={20} color="var(--ghrs-amber-600)" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>XP</p>
            </div>
          </div>

          {/* Money */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}
            >
              <CoinIcon size={20} color="var(--ghrs-green-600)" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight truncate" style={{ color: 'var(--ghrs-green-600)' }}>{fmtMoney(moneyBalance)}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>د.ب</p>
            </div>
          </div>
        </div>

        {/* === Streak (if any) === */}
        {streak > 0 && (
          <div
            className="mb-5 rounded-2xl p-3.5 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, var(--ghrs-amber-50), var(--ghrs-green-50))',
              border: '1.5px solid var(--ghrs-amber-200)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ghrs-amber-100)' }}
            >
              <FireIcon size={20} color="var(--ghrs-amber-600)" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>سلسلة {streak} أيام!</p>
              <p className="text-[11px]" style={{ color: 'var(--ghrs-text-secondary)' }}>استمر في الإنجاز!</p>
            </div>
          </div>
        )}

        {/* === Today's Tasks === */}
        <div
          className="mb-5 rounded-3xl p-5"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1.5px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>مهام اليوم</h2>
            <Link
              href="/child-mode/tasks"
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-600)', border: '1px solid var(--ghrs-green-200)' }}
            >
              عرض الكل
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2 ghrs-animate-float">🌿</div>
              <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>ما في مهام اليوم</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ghrs-text-tertiary)' }}>استرح وتمتّع بيومك!</p>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-1">
                    <CheckIcon size={12} color="var(--ghrs-green-600)" />
                    <span className="text-xs font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{completedCount}</span>
                  </div>
                  <div className="w-px h-3" style={{ background: 'var(--ghrs-border-default)' }} />
                  <div className="flex items-center gap-1">
                    <ClockIcon size={12} color="var(--ghrs-amber-600)" />
                    <span className="text-xs font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{pendingCount}</span>
                  </div>
                  <div className="flex-1" />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                    {totalTasks} مهمة
                  </span>
                </div>
                {totalTasks > 0 && (
                  <div className="ghrs-progress-bar" style={{ height: '5px' }}>
                    <div
                      className="ghrs-progress-fill"
                      style={{ width: `${Math.round((completedCount / totalTasks) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Task cards */}
              <div className="space-y-2.5">
                {tasks.slice(0, 3).map((task) => {
                  const isCompleted = completedToday.includes(task.id)
                  const isPending = pendingToday.includes(task.id)
                  const isQuran = task.task_type === 'quran'
                  const isDua = task.task_type === 'dua'

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl p-3 transition-all"
                      style={{
                        background: isCompleted ? 'var(--ghrs-green-50)' : isPending ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-secondary)',
                        border: `1px solid ${isCompleted ? 'var(--ghrs-green-200)' : isPending ? 'var(--ghrs-amber-200)' : 'var(--ghrs-border-default)'}`,
                        opacity: isCompleted ? 0.8 : 1,
                      }}
                    >
                      {/* Category icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isCompleted ? 'var(--ghrs-green-200)' : isPending ? 'var(--ghrs-amber-200)' : 'var(--ghrs-bg-card)',
                          border: `1px solid ${isCompleted ? 'var(--ghrs-green-300)' : isPending ? 'var(--ghrs-amber-300)' : 'var(--ghrs-border-default)'}`,
                        }}
                      >
                        {isCompleted ? (
                          <CheckIcon size={16} color="var(--ghrs-green-700)" />
                        ) : isPending ? (
                          <ClockIcon size={16} color="var(--ghrs-amber-700)" />
                        ) : isQuran ? (
                          <LeafIcon size={16} color="var(--ghrs-green-600)" />
                        ) : isDua ? (
                          <SparkleIcon size={16} color="var(--ghrs-amber-600)" />
                        ) : (
                          <TasksIcon size={16} color="var(--ghrs-text-tertiary)" />
                        )}
                      </div>

                      {/* Title + rewards */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-xs font-bold truncate leading-tight"
                          style={{
                            color: isCompleted ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            {task.xp_reward} XP
                          </span>
                          {task.money_reward > 0 && (
                            <span className="text-[10px] font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                              {fmtMoney(task.money_reward)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={isCompleted || isPending || completingTask === task.id}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex-shrink-0"
                        style={{
                          background: isCompleted ? 'var(--ghrs-green-500)' : isPending ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)',
                          color: 'white',
                          opacity: isCompleted || isPending || completingTask === task.id ? 0.7 : 1,
                        }}
                      >
                        {isCompleted ? 'تم' : isPending ? 'بانتظار' : completingTask === task.id ? '...' : 'أنجز!'}
                      </button>
                    </div>
                  )
                })}

                {tasks.length > 3 && (
                  <Link
                    href="/child-mode/tasks"
                    className="block text-center text-[10px] font-bold py-2 rounded-lg transition-all active:scale-95"
                    style={{ color: 'var(--ghrs-green-600)', background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}
                  >
                    عرض {tasks.length - 3} مهام إضافية
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        {/* === Quick Actions === */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/child-mode/tasks"
            className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.96]"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}>
              <TasksIcon size={22} color="var(--ghrs-green-600)" />
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>مهامي</span>
          </Link>

          <Link
            href="/child-mode/gifts"
            className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.96]"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-purple-50)', border: '1px solid var(--ghrs-purple-200)' }}>
              <GiftsIcon size={22} color="var(--ghrs-purple-600)" />
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>هداياي</span>
          </Link>

          <Link
            href="/child-mode/garden"
            className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.96]"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1.5px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)', border: '1px solid var(--ghrs-amber-200)' }}>
              <GardenIcon size={22} color="var(--ghrs-amber-600)" />
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>حديقتي</span>
          </Link>
        </div>
      </div>

      <ChildBottomNav />
    </div>
  )
}
