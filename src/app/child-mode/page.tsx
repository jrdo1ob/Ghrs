'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { LEVELS, getLevel, getNextLevel, Level } from '@/lib/gamification'
import CelebrationModal from '@/components/CelebrationModal'
import { CopyIcon, StarIcon, CoinIcon, ClockIcon, CheckIcon, LeafIcon, FireIcon, PartyIcon, TrophyIcon, ShieldIcon } from '@/components/icons'

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
  const prevLevelRef = useRef<Level | null>(null)
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

      // Step 1: Get member data first (needed for tasks query)
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', childId)
        .single()

      if (!memberData || memberData.role !== 'child') {
        router.push('/family-login')
        return
      }

      setMember(memberData)
      setStreak(memberData.current_streak || 0)

      // Step 2: Run independent queries in parallel
      const today = new Date().toISOString().split('T')[0]
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const [tasksResult, xpResult, moneyResult, completionsResult, recentManualResult] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', memberData.family_id).eq('is_active', true).eq('is_deleted', false).eq('is_paused', false),
        supabase.from('xp_transactions').select('amount').eq('member_id', childId),
        supabase.from('money_transactions').select('amount, type').eq('member_id', childId).eq('status', 'approved'),
        supabase.from('task_completions').select('task_id, approved').eq('member_id', childId).gte('completed_at', today),
        supabase.from('xp_transactions').select('amount, description, created_at').eq('member_id', childId).eq('source', 'manual').gte('created_at', fiveMinAgo).order('created_at', { ascending: false }).limit(1),
      ])

      setTasks(tasksResult.data || [])

      const totalXp = xpResult.data?.reduce((sum, t) => sum + t.amount, 0) || 0
      setXp(totalXp)

      const totalMoney = moneyResult.data?.reduce((sum, t) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0) || 0
      setMoneyBalance(totalMoney)

      const completedIds = completionsResult.data?.filter(c => c.approved).map(c => c.task_id) || []
      const pendingIds = completionsResult.data?.filter(c => !c.approved).map(c => c.task_id) || []
      setCompletedToday(completedIds)
      setPendingToday(pendingIds)

      const recentManual = recentManualResult.data
      if (recentManual && recentManual.length > 0) {
        const adj = recentManual[0]
        const isReward = adj.amount > 0
        setTimeout(() => {
          setToast({
            type: isReward ? 'success' : 'error',
            message: isReward
              ? `مكافأة من الوالد: ${adj.description} (+${adj.amount} XP)`
              : `تنبيه من الوالد: ${adj.description} (${adj.amount} XP)`
          })
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

  // Track level changes for celebration
  useEffect(() => {
    if (prevLevelRef.current && level.level > prevLevelRef.current.level) {
      setCelebrationLevel(level)
      setShowCelebration(true)
    }
    prevLevelRef.current = level
  }, [level])

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
        ? 'تم إنجاز المهمة! بانتظار موافقة الوالد'
        : 'تم إنجاز المهمة وحصلت على المكافآت!'
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('child_id')
    localStorage.removeItem('family_id')
    router.push('/family-login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce"><LeafIcon size={48} /></div>
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

      <CelebrationModal
        show={showCelebration}
        level={celebrationLevel?.level || 1}
        levelName={celebrationLevel?.name || ''}
        levelEmoji={celebrationLevel?.emoji || '🌱'}
        onClose={() => setShowCelebration(false)}
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

        {/* Garden Hero */}
        <div className="ghrs-card p-6 mb-6 text-center relative overflow-hidden">
          {/* Background gradient based on level */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{ 
              background: `linear-gradient(135deg, ${level.soilColor} 0%, transparent 100%)` 
            }} 
          />
          
          <div className="relative">
            <div className={`mb-4 ${level.plantSize} ghrs-animate-pulse`}>
              {level.emoji}
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>
              مرحباً {member?.name}!
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              اليوم يوم جديد للنمو
            </p>
            
            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}>
              <span className="text-lg">{level.emoji}</span>
              <span className="font-bold" style={{ color: 'var(--ghrs-green-700)' }}>المستوى {level.level}: {level.name}</span>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="ghrs-card p-5 mb-6" style={{ background: 'linear-gradient(135deg, var(--ghrs-green-50), var(--ghrs-amber-50))', border: '2px solid var(--ghrs-green-200)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-text-secondary)' }}>رصيدي</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ghrs-amber-100)' }}>
                <StarIcon size={24} color="var(--ghrs-amber-600)" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>نقطة XP</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ghrs-green-100)' }}>
                <CoinIcon size={24} color="var(--ghrs-green-600)" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{fmtMoney(moneyBalance)}</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>رصيد مالي</p>
              </div>
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="ghrs-card p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
              التقدم للمستوى التالي
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
              {xp} / {nextLevel?.minXp || '∞'} XP
            </span>
          </div>
          <div className="ghrs-progress-bar">
            <div 
              className="ghrs-progress-fill"
              style={{ width: `${Math.min(100, progressToNext)}%` }}
            />
          </div>
          {nextLevel && (
            <p className="text-xs mt-2" style={{ color: 'var(--ghrs-text-tertiary)' }}>
              {nextLevel.minXp - xp} نقطة للوصول إلى {nextLevel.name} {nextLevel.emoji}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="ghrs-card p-4 text-center">
            <div className="text-2xl mb-1"><StarIcon size={24} /></div>
            <p className="text-xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>نقاط الخبرة</p>
          </div>
          <div className="ghrs-card p-4 text-center">
            <div className="text-2xl mb-1"><CheckIcon size={24} /></div>
            <p className="text-xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{completedToday.length}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>مهام اليوم</p>
          </div>
          <div className="ghrs-card p-4 text-center">
            <div className="text-2xl mb-1"><FireIcon size={24} /></div>
            <p className="text-xl font-bold" style={{ color: 'var(--ghrs-red-500)' }}>{streak}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>أيام متتالية</p>
          </div>
        </div>

        {/* Tasks */}
        <div className="ghrs-card p-5 mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}><CopyIcon size={20} className="inline" /> مهام اليوم</h2>
          
          {tasks.length === 0 ? (
            <EmptyState
              icon={<PartyIcon size={48} />}
              title="ما في مهام اليوم"
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
                    className="flex items-center justify-between rounded-xl p-4 transition-all"
                    style={{ 
                      background: isCompleted ? 'var(--ghrs-green-50)' : isPending ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)',
                      border: `1px solid ${isCompleted ? 'var(--ghrs-green-200)' : isPending ? 'var(--ghrs-amber-200)' : 'var(--ghrs-border-default)'}`
                    }}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold" style={{ 
                        color: isCompleted ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            <StarIcon size={14} className="inline" /> {task.xp_reward} XP
                        </span>
                        {task.money_reward > 0 && (
                          <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                            <CoinIcon size={14} className="inline" /> {fmtMoney(task.money_reward)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={isCompleted || isPending || completingTask === task.id}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isCompleted
                          ? 'cursor-not-allowed'
                          : isPending
                          ? 'cursor-wait'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        background: isCompleted ? 'var(--ghrs-green-500)' : isPending ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)',
                        color: 'white',
                        opacity: isCompleted || isPending || completingTask === task.id ? 0.8 : 1
                      }}
                    >
                      {isCompleted ? <><CheckIcon size={14} className="inline" /> تم</> : isPending ? <><ClockIcon size={14} className="inline" /> بانتظار</> : completingTask === task.id ? <><ClockIcon size={14} className="inline" /> جاري...</> : 'أنجزت!'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="text-sm font-semibold"
            style={{ color: 'var(--ghrs-text-tertiary)' }}
          >
            خروج
          </button>
        </div>
      </div>

      {/* Child Bottom Nav */}
      <ChildBottomNav />
    </div>
  )
}
