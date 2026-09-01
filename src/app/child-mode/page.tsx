'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'

interface Level {
  level: number
  name: string
  emoji: string
  minXp: number
  maxXp: number
  soilColor: string
  plantSize: string
}

const LEVELS: Level[] = [
  { level: 1, name: 'البذرة', emoji: '🌰', minXp: 0, maxXp: 50, soilColor: '#8B4513', plantSize: 'text-2xl' },
  { level: 2, name: 'البرعم', emoji: '🌱', minXp: 50, maxXp: 200, soilColor: '#A0522D', plantSize: 'text-3xl' },
  { level: 3, name: 'النبتة', emoji: '🌿', minXp: 200, maxXp: 500, soilColor: '#6B8E23', plantSize: 'text-4xl' },
  { level: 4, name: 'الشجرة الصغيرة', emoji: '🌳', minXp: 500, maxXp: 1000, soilColor: '#228B22', plantSize: 'text-5xl' },
  { level: 5, name: 'الشجرة الكبيرة', emoji: '🌲', minXp: 1000, maxXp: 2000, soilColor: '#006400', plantSize: 'text-6xl' },
  { level: 6, name: 'الحديقة', emoji: '🏡', minXp: 2000, maxXp: 999999, soilColor: '#32CD32', plantSize: 'text-7xl' },
]

export default function ChildModePage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [xp, setXp] = useState(0)
  const [completedToday, setCompletedToday] = useState<string[]>([])
  const [pendingToday, setPendingToday] = useState<string[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [streak, setStreak] = useState(0)
  const router = useRouter()
  const supabase = createClient()

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

      setMember(memberData)

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', memberData.family_id)
        .eq('is_active', true)

      setTasks(tasksData || [])

      // Get XP
      const { data: xpData } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('member_id', childId)

      const totalXp = xpData?.reduce((sum, t) => sum + t.amount, 0) || 0
      setXp(totalXp)

      // Get today's completions
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

      // Calculate streak (simplified - count consecutive days with completions)
      const { data: streakData } = await supabase
        .from('task_completions')
        .select('completed_at')
        .eq('member_id', childId)
        .order('completed_at', { ascending: false })
        .limit(30)

      let currentStreak = 0
      const todayDate = new Date()
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(todayDate)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        const hasCompletion = streakData?.some(c => c.completed_at.startsWith(dateStr))
        if (hasCompletion) {
          currentStreak++
        } else if (i > 0) {
          break
        }
      }
      setStreak(currentStreak)

      setLoading(false)
    }

    getData()
  }, [])

  const getLevel = (xp: number): Level => {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXp) return LEVELS[i]
    }
    return LEVELS[0]
  }

  const getNextLevel = (currentLevel: Level): Level | null => {
    const idx = LEVELS.findIndex(l => l.level === currentLevel.level)
    return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null
  }

  const level = getLevel(xp)
  const nextLevel = getNextLevel(level)
  const progressToNext = nextLevel 
    ? ((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100 
    : 100

  const handleCompleteTask = async (taskId: string) => {
    const childId = localStorage.getItem('child_id')
    if (!childId) return

    const { error } = await supabase
      .from('task_completions')
      .insert({
        task_id: taskId,
        member_id: childId,
        completed_at: new Date().toISOString(),
        approved: false
      })

    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ أثناء إنجاز المهمة' })
      return
    }

    setPendingToday([...pendingToday, taskId])
    setToast({ type: 'success', message: 'تم إنجاز المهمة! بانتظار موافقة الوالد ⏳' })
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
          <div className="text-6xl mb-4 animate-bounce">🌱</div>
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
              مرحباً {member?.name}! 👋
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              اليوم يوم جديد للنمو 🌿
            </p>
            
            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}>
              <span className="text-lg">{level.emoji}</span>
              <span className="font-bold" style={{ color: 'var(--ghrs-green-700)' }}>المستوى {level.level}: {level.name}</span>
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
            <div className="text-2xl mb-1">⭐</div>
            <p className="text-xl font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{xp}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>نقاط الخبرة</p>
          </div>
          <div className="ghrs-card p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-xl font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{completedToday.length}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>مهام اليوم</p>
          </div>
          <div className="ghrs-card p-4 text-center">
            <div className="text-2xl mb-1">🔥</div>
            <p className="text-xl font-bold" style={{ color: 'var(--ghrs-red-500)' }}>{streak}</p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-secondary)' }}>أيام متتالية</p>
          </div>
        </div>

        {/* Tasks */}
        <div className="ghrs-card p-5 mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>📋 مهام اليوم</h2>
          
          {tasks.length === 0 ? (
            <EmptyState
              icon="🎉"
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
                          ⭐ {task.xp_reward} XP
                        </span>
                        {task.money_reward > 0 && (
                          <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                            💰 {task.money_reward}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={isCompleted || isPending}
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
                        opacity: isCompleted || isPending ? 0.8 : 1
                      }}
                    >
                      {isCompleted ? '✓ تم' : isPending ? '⏳ بانتظار' : 'أنجزت!'}
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
            🚪 خروج
          </button>
        </div>
      </div>

      {/* Child Bottom Nav */}
      <ChildBottomNav />
    </div>
  )
}
