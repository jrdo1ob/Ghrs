'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import ParticleEffects from '@/components/ParticleEffects'
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
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
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

    const { error } = await supabase.rpc('complete_task_with_rewards', { p_task_id: taskId, p_member_id: childId })
    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ أثناء إنجاز المهمة' })
      setCompletingTask(null); return
    }

    const task = tasks.find(t => t.id === taskId)
    const needsApproval = task?.requires_approval !== false

    setPendingToday([...pendingToday, taskId])
    setCompletingTask(null)

    if (!needsApproval) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2500)
    }

    setToast({
      type: 'success',
      message: needsApproval ? 'تم إنجاز المهمة! بانتظار موافقة الوالد' : 'تم إنجاز المهمة وحصلت على المكافآت!'
    })
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

      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-32">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ghrs-text-primary)' }}>مهامي</h1>
        {childName && <p className="text-sm mb-6" style={{ color: 'var(--ghrs-text-secondary)' }}>مرحباً {childName}! أكمل مهامك اليومية</p>}

        {tasks.length === 0 ? (
          <EmptyState icon={<CopyIcon size={48} />} title="ما في مهام" description="استرح وتمتّع بيومك!" />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const completed = isCompletedToday(task.id)
              const pending = isPendingToday(task.id)
              const priority = PRIORITY_MAP[task.priority || 'medium'] || PRIORITY_MAP.medium
              const isQuran = task.task_type === 'quran'
              const isDua = task.task_type === 'dua'
              const isExpanded = expandedTask === task.id
              const hasContent = isQuran || isDua

              return (
                <div key={task.id} className="ghrs-card transition-all" style={{
                  borderRight: `4px solid ${priority.color}`,
                  opacity: completed ? 0.7 : 1,
                }}>
                  {/* Quran/Dua Card - Islamic Design */}
                  {hasContent ? (
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: isQuran ? 'var(--ghrs-green-100)' : 'var(--ghrs-amber-100)' }}>
                            {isQuran ? <QuranIcon size={22} color="var(--ghrs-green-600)" /> : <SparkleIcon size={22} color="var(--ghrs-amber-600)" />}
                          </div>
                          <div>
                            <h3 className="font-bold" style={{
                              color: completed ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                              textDecoration: completed ? 'line-through' : 'none'
                            }}>{task.title}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                                background: isQuran ? 'var(--ghrs-green-50)' : 'var(--ghrs-amber-50)',
                                color: isQuran ? 'var(--ghrs-green-700)' : 'var(--ghrs-amber-700)'
                              }}>
                                {task.quran_action_type === 'memorize' ? 'حفظ' : task.quran_action_type === 'read' ? 'قراءة' : isDua ? 'دعاء' : ''}
                              </span>
                              {task.surah_number && <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>آية {task.from_ayah}-{task.to_ayah}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quran Content */}
                      {task.custom_content_text && (
                        <div className="mb-4 p-4 rounded-xl text-right" style={{
                          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                          border: '1px solid var(--ghrs-green-200)',
                          fontFamily: "'Scheherazade New', 'Amiri', serif",
                          fontSize: '1.4rem',
                          lineHeight: '2.4',
                          color: 'var(--ghrs-text-primary)',
                        }}>
                          {task.custom_content_text}
                        </div>
                      )}

                      {/* Rewards */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            <StarIcon size={14} className="inline" /> {task.xp_reward} XP
                          </span>
                          {task.money_reward > 0 && (
                            <span className="text-sm font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                              <CoinIcon size={14} className="inline" /> {fmtMoney(task.money_reward)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={completed || pending || completingTask === task.id}
                          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                          style={{
                            background: completed ? 'var(--ghrs-green-500)' : pending ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)',
                            color: 'white',
                            opacity: completed || pending || completingTask === task.id ? 0.8 : 1
                          }}
                        >
                          {completed ? <><CheckIcon size={16} className="inline" /> تم</> : pending ? <><ClockIcon size={16} className="inline" /> بانتظار</> : completingTask === task.id ? '...' : task.quran_action_type === 'memorize' ? 'تم الحفظ بفضل الله' : 'تمت القراءة بفضل الله'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Standard Task Card */
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold" style={{
                            color: completed ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-primary)',
                            textDecoration: completed ? 'line-through' : 'none'
                          }}>
                            {task.title}
                          </h3>
                          {task.description && <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>{task.description}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-amber-600)' }}>
                              <StarIcon size={14} className="inline" /> {task.xp_reward} XP
                            </span>
                            {task.money_reward > 0 && (
                              <span className="text-xs font-semibold" style={{ color: 'var(--ghrs-green-600)' }}>
                                <CoinIcon size={14} className="inline" /> {fmtMoney(task.money_reward)}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                              {task.frequency === 'daily' ? 'يومي' : task.frequency === 'weekly' ? 'أسبوعي' : task.frequency === 'monthly' ? 'شهري' : task.frequency === 'once' ? 'مرة واحدة' : 'مخصص'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={completed || pending || completingTask === task.id}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                          style={{
                            background: completed ? 'var(--ghrs-green-500)' : pending ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)',
                            color: 'white',
                            opacity: completed || pending || completingTask === task.id ? 0.8 : 1
                          }}
                        >
                          {completed ? <><CheckIcon size={16} className="inline" /> تم</> : pending ? <><ClockIcon size={16} className="inline" /> بانتظار</> : completingTask === task.id ? '...' : 'أنجزت!'}
                        </button>
                      </div>
                    </div>
                  )}
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
