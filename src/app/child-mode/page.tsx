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
import {
  StarIcon,
  CoinIcon,
  ClockIcon,
  CheckIcon,
  FireIcon,
  SparkleIcon,
  LeafIcon,
  WaterIcon,
} from '@/components/icons'
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
  const [completionFeedback, setCompletionFeedback] = useState<{
    taskName: string
    xp: number
    money: number
    needsApproval: boolean
  } | null>(null)
  const prevLevelRef = useRef<Level | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()
  const { play } = useSound()

  useEffect(() => {
    const getData = async () => {
      try {
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
      } catch (err) {
        console.error('[GHRS] Home data fetch error:', err)
        setToast({ type: 'error', message: 'حدث خطأ أثناء تحميل البيانات' })
      } finally {
        setLoading(false)
      }
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

      setPendingToday(prev => [...prev, taskId])

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
  const isMaxLevel = !nextLevel
  const allTasksDone = totalTasks > 0 && completedCount === totalTasks
  const hasPendingOnly = totalTasks > 0 && completedCount === 0 && pendingCount > 0

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
        onClose={() => {
          setShowCompletionFeedback(false)
          setCompletionFeedback(null)
        }}
        formatMoney={fmtMoney}
      />

      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        {/* Top bar */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* === SECTION 1: Greeting / Hero === */}
        <div className="mb-5">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--ghrs-surface-warm)',
                border: '1px solid var(--ghrs-border-default)',
              }}
            >
              <span className="text-2xl leading-none">{level.emoji}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className="text-xl font-extrabold leading-tight tracking-tight"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                مرحباً {member?.name}
              </h1>
              <p
                className="text-[13px] font-medium mt-0.5"
                style={{ color: 'var(--ghrs-text-secondary)' }}
              >
                {isMaxLevel
                  ? 'حديقتك مزهرة — كمّل إنجازك'
                  : 'مستعد تكبر حديقتك اليوم؟'}
              </p>
            </div>
          </div>
        </div>

        {/* === SECTION 2: Growth Goal (Main Focus) === */}
        <div
          className="mb-4 rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          {/* Label */}
          <div className="flex items-center gap-1.5 mb-4">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--ghrs-text-tertiary)' }}
            >
              هدفك القادم
            </span>
          </div>

          {/* Current → Next */}
          <div className="flex items-center justify-between mb-4">
            {/* Current */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--ghrs-bg-secondary)',
                  border: '1px solid var(--ghrs-border-default)',
                }}
              >
                <span className="text-xl leading-none">{level.emoji}</span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--ghrs-text-tertiary)' }}
                >
                  مستواك الآن
                </p>
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: 'var(--ghrs-text-primary)' }}
                >
                  {level.name}
                </p>
              </div>
            </div>

            {nextLevel && (
              <>
                {/* Arrow */}
                <div
                  className="flex items-center px-1"
                  style={{ color: 'var(--ghrs-text-tertiary)' }}
                >
                  <span className="text-base leading-none" style={{ direction: 'ltr' }}>←</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 text-left">
                    <p
                      className="text-[10px] font-semibold"
                      style={{ color: 'var(--ghrs-text-tertiary)' }}
                    >
                      التالي
                    </p>
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: 'var(--ghrs-text-primary)' }}
                    >
                      {nextLevel.name}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'var(--ghrs-surface-success)',
                      border: '1px solid var(--ghrs-green-200)',
                    }}
                  >
                    <span className="text-xl leading-none">{nextLevel.emoji}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* XP Progress */}
          {nextLevel ? (
            <>
              <div className="ghrs-garden-xp-bar mb-2">
                <div
                  className="ghrs-garden-xp-fill"
                  style={{ width: `${Math.min(100, progressToNext)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p
                  className="text-[11px] font-semibold tabular-nums"
                  style={{ color: 'var(--ghrs-text-secondary)' }}
                >
                  {xp} / {nextLevel.minXp} XP
                </p>
                <p
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: 'var(--ghrs-green-600)' }}
                >
                  باقي {nextLevel.minXp - xp} XP
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-1">
              <p
                className="text-sm font-bold"
                style={{ color: 'var(--ghrs-green-600)' }}
              >
                وصلت لأعلى مستوى!
              </p>
            </div>
          )}
        </div>

        {/* === SECTION 3: Today's Tasks (Primary Action) === */}
        <div
          className="mb-4 rounded-2xl p-5"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[15px] font-extrabold tracking-tight"
              style={{ color: 'var(--ghrs-text-primary)' }}
            >
              مهام اليوم
            </h2>
            {totalTasks > 0 && (
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                style={{
                  background: completedCount === totalTasks
                    ? 'var(--ghrs-surface-success)'
                    : 'var(--ghrs-bg-secondary)',
                  border: '1px solid var(--ghrs-border-default)',
                }}
              >
                <CheckIcon
                  size={11}
                  color={completedCount === totalTasks ? 'var(--ghrs-green-600)' : 'var(--ghrs-text-secondary)'}
                />
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{
                    color: completedCount === totalTasks
                      ? 'var(--ghrs-green-700)'
                      : 'var(--ghrs-text-secondary)',
                  }}
                >
                  {completedCount}/{totalTasks}
                </span>
              </div>
            )}
          </div>

          {totalTasks === 0 ? (
            /* Empty state */
            <div className="text-center py-8">
              <div
                className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'var(--ghrs-surface-success)',
                  border: '1px solid var(--ghrs-green-200)',
                }}
              >
                <span className="text-3xl leading-none">🎉</span>
              </div>
              <p
                className="text-sm font-bold"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                ما في مهام اليوم
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--ghrs-text-tertiary)' }}
              >
                استرح وتمتّع بيومك
              </p>
            </div>
          ) : (
            <>
              {/* Task progress */}
              {totalTasks > 0 && (
                <div className="mb-4">
                  <div className="ghrs-garden-xp-bar" style={{ height: '6px' }}>
                    <div
                      className="ghrs-garden-xp-fill"
                      style={{
                        width: `${Math.round((completedCount / totalTasks) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Task cards */}
              <div className="space-y-2.5">
                {tasks.slice(0, 4).map((task) => {
                  const isCompleted = completedToday.includes(task.id)
                  const isPending = pendingToday.includes(task.id)
                  const isQuran = task.task_type === 'quran'
                  const isDua = task.task_type === 'dua'

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all"
                      style={{
                        background: isCompleted
                          ? 'var(--ghrs-surface-success)'
                          : isPending
                            ? 'var(--ghrs-surface-pending)'
                            : 'var(--ghrs-bg-card)',
                        border: `1px solid ${
                          isCompleted
                            ? 'var(--ghrs-green-200)'
                            : isPending
                              ? 'var(--ghrs-amber-200)'
                              : 'var(--ghrs-border-default)'
                        }`,
                        opacity: isCompleted ? 0.7 : 1,
                      }}
                    >
                      {/* Category icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isCompleted
                            ? 'var(--ghrs-green-100)'
                            : isPending
                              ? 'var(--ghrs-amber-100)'
                              : 'var(--ghrs-bg-secondary)',
                          border: `1px solid ${
                            isCompleted
                              ? 'var(--ghrs-green-200)'
                              : isPending
                                ? 'var(--ghrs-amber-200)'
                                : 'var(--ghrs-border-default)'
                          }`,
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
                          <WaterIcon size={16} color="var(--ghrs-text-tertiary)" />
                        )}
                      </div>

                      {/* Title + rewards */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-[13px] font-bold truncate leading-tight"
                          style={{
                            color: isCompleted
                              ? 'var(--ghrs-green-700)'
                              : 'var(--ghrs-text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums"
                            style={{ color: 'var(--ghrs-amber-600)' }}
                          >
                            {task.xp_reward} XP
                          </span>
                          {task.money_reward > 0 && (
                            <>
                              <span
                                className="w-1 h-1 rounded-full"
                                style={{ background: 'var(--ghrs-border-strong)' }}
                              />
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums"
                                style={{ color: 'var(--ghrs-green-600)' }}
                              >
                                {fmtMoney(task.money_reward)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action button */}
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={
                          isCompleted || isPending || completingTask === task.id
                        }
                        className="px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 flex-shrink-0"
                        style={{
                          background: isCompleted
                            ? 'var(--ghrs-green-500)'
                            : isPending
                              ? 'var(--ghrs-amber-500)'
                              : 'var(--ghrs-green-600)',
                          color: 'white',
                          opacity:
                            isCompleted || isPending || completingTask === task.id
                              ? 0.6
                              : 1,
                        }}
                      >
                        {isCompleted
                          ? 'تم'
                          : isPending
                            ? 'بانتظار'
                            : completingTask === task.id
                              ? '...'
                              : 'أنجز!'}
                      </button>
                    </div>
                  )
                })}

                {/* Show more link */}
                {tasks.length > 4 && (
                  <Link
                    href="/child-mode/tasks"
                    className="flex items-center justify-center gap-1.5 text-[12px] font-bold py-3 rounded-xl transition-all active:scale-[0.97]"
                    style={{
                      color: 'var(--ghrs-text-secondary)',
                      background: 'var(--ghrs-bg-secondary)',
                      border: '1px solid var(--ghrs-border-default)',
                    }}
                  >
                    عرض باقي المهام
                    <span style={{ direction: 'ltr', fontSize: '10px' }}>←</span>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        {/* === SECTION 4: Streak (Compact) === */}
        {streak > 0 && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--ghrs-surface-pending)',
                border: '1px solid var(--ghrs-amber-200)',
              }}
            >
              <FireIcon size={14} color="var(--ghrs-amber-600)" />
            </div>
            <p
              className="text-[13px] font-bold"
              style={{ color: 'var(--ghrs-text-primary)' }}
            >
              يوم {streak} متواصل — كمّل على نفس الإيقاع
            </p>
          </div>
        )}
      </div>

      <ChildBottomNav />
    </div>
  )
}
