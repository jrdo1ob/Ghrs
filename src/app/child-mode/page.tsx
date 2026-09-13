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
import QuickActionCard from '@/components/child/QuickActionCard'
import ChildLoading from '@/components/child/ChildLoading'
import { useSound } from '@/components/child/SoundManager'
import { StarIcon, CoinIcon, ClockIcon, CheckIcon, GiftsIcon, TasksIcon, GardenIcon, FireIcon, PartyIcon, SparkleIcon } from '@/components/icons'
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
    return <ChildLoading text="جاري تحميل homeك..." />
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

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        {/* Header with Theme Toggle */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Growth Hero */}
        <div className="mb-6 text-center relative overflow-hidden rounded-3xl p-8" style={{ background: 'linear-gradient(180deg, var(--ghrs-green-50) 0%, var(--ghrs-bg-card) 100%)', border: '1px solid var(--ghrs-green-200)' }}>
          {/* Subtle decorative elements */}
          <div className="absolute top-3 right-6 opacity-15"><SparkleIcon size={20} /></div>
          <div className="absolute top-5 left-8 opacity-10"><SparkleIcon size={14} /></div>

          <div className="relative">
            {/* Plant with growth animation */}
            <div className={`mb-4 ${level.plantSize} transition-transform duration-500`} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
              {level.emoji}
            </div>

            {/* Greeting */}
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>
              مرحباً {member?.name}!
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              اليوم يوم جديد للنمو
            </p>
            
            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full" style={{ background: 'var(--ghrs-green-100)', border: '2px solid var(--ghrs-green-300)' }}>
              <span className="text-xl">{level.emoji}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--ghrs-green-700)' }}>المستوى {level.level}: {level.name}</span>
            </div>

            {/* XP Progress */}
            {nextLevel && (
              <div className="mt-5 max-w-xs mx-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
                    التقدم للمستوى التالي
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                    {xp} / {nextLevel.minXp} XP
                  </span>
                </div>
                <div className="ghrs-progress-bar" style={{ height: '8px' }}>
                  <div
                    className="ghrs-progress-fill"
                    style={{ width: `${Math.min(100, progressToNext)}%` }}
                  />
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                  {nextLevel.minXp - xp} نقطة للوصول إلى {nextLevel.name} {nextLevel.emoji}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Balance Card */}
        <div className="mb-6 rounded-3xl p-5" style={{ background: 'var(--ghrs-bg-card)', border: '1.5px solid var(--ghrs-border-default)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>رصيدي</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--ghrs-amber-50)', border: '1.5px solid var(--ghrs-amber-200)' }}>
                <StarIcon size={22} color="var(--ghrs-amber-600)" />
              </div>
              <div>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>XP</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--ghrs-green-50)', border: '1.5px solid var(--ghrs-green-200)' }}>
                <CoinIcon size={22} color="var(--ghrs-green-600)" />
              </div>
              <div>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--ghrs-green-600)' }}>{fmtMoney(moneyBalance)}</p>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>د.ب</p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Tasks Summary */}
        <div className="mb-6 rounded-3xl p-5" style={{ background: 'var(--ghrs-bg-card)', border: '1.5px solid var(--ghrs-border-default)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>مهام اليوم</h2>
            <Link href="/child-mode/tasks" className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95" style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-600)' }}>
              عرض الكل
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <PartyIcon size={36} />
              <p className="text-sm font-bold mt-2" style={{ color: 'var(--ghrs-text-primary)' }}>ما في مهام اليوم</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>استرح وتمتّع بيومك!</p>
            </div>
          ) : (
            <>
              {/* Progress Summary */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: 'var(--ghrs-bg-tertiary)' }}>
                <div className="flex items-center gap-1.5">
                  <CheckIcon size={14} color="var(--ghrs-green-600)" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{completedCount}</span>
                </div>
                <div className="w-px h-3" style={{ background: 'var(--ghrs-border-default)' }} />
                <div className="flex items-center gap-1.5">
                  <ClockIcon size={14} color="var(--ghrs-amber-600)" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{pendingCount}</span>
                </div>
                <div className="w-px h-3" style={{ background: 'var(--ghrs-border-default)' }} />
                <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{totalTasks} المجموع</span>
              </div>

              {/* Task List (max 3 visible) */}
              <div className="space-y-2">
                {tasks.slice(0, 3).map((task) => {
                  const isCompleted = completedToday.includes(task.id)
                  const isPending = pendingToday.includes(task.id)

                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-xl p-3 transition-all"
                      style={{
                        background: isCompleted ? 'var(--ghrs-green-50)' : isPending ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)',
                        border: `1px solid ${isCompleted ? 'var(--ghrs-green-200)' : isPending ? 'var(--ghrs-amber-200)' : 'var(--ghrs-border-default)'}`
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate" style={{
                          color: isCompleted ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                          textDecoration: isCompleted ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            <StarIcon size={10} className="inline" /> {task.xp_reward} XP
                          </span>
                          {task.money_reward > 0 && (
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                              <CoinIcon size={10} className="inline" /> {fmtMoney(task.money_reward)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={isCompleted || isPending || completingTask === task.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isCompleted
                            ? 'cursor-not-allowed'
                            : isPending
                            ? 'cursor-wait'
                            : 'active:scale-95'
                        }`}
                        style={{
                          background: isCompleted ? 'var(--ghrs-green-500)' : isPending ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)',
                          color: 'white',
                          opacity: isCompleted || isPending || completingTask === task.id ? 0.8 : 1
                        }}
                      >
                        {isCompleted ? <><CheckIcon size={12} className="inline" /> تم</> : isPending ? <><ClockIcon size={12} className="inline" /> بانتظار</> : completingTask === task.id ? '...' : 'أنجز!'}
                      </button>
                    </div>
                  )
                })}
                {tasks.length > 3 && (
                  <Link href="/child-mode/tasks" className="block text-center text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95" style={{ color: 'var(--ghrs-green-600)', background: 'var(--ghrs-green-50)' }}>
                    عرض {tasks.length - 3} مهام إضافية
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <QuickActionCard href="/child-mode/tasks" icon={<TasksIcon size={24} color="var(--ghrs-green-600)" />} label="مهامي" color="var(--ghrs-green-50)" />
          <QuickActionCard href="/child-mode/gifts" icon={<GiftsIcon size={24} color="var(--ghrs-purple-600)" />} label="هداياي" color="var(--ghrs-purple-50)" />
          <QuickActionCard href="/child-mode/garden" icon={<GardenIcon size={24} color="var(--ghrs-amber-600)" />} label="حديقتي" color="var(--ghrs-amber-50)" />
        </div>

        {/* Motivation Card */}
        {streak > 0 && (
          <div className="rounded-3xl p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, var(--ghrs-amber-50), var(--ghrs-red-50))', border: '1.5px solid var(--ghrs-amber-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-amber-100)' }}>
              <FireIcon size={22} color="var(--ghrs-amber-600)" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>سلسلة {streak} أيام!</p>
              <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>استمر في الإنجاز!</p>
            </div>
          </div>
        )}
      </div>

      <ChildBottomNav />
    </div>
  )
}
