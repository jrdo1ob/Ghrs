'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { BookIcon, QuranIcon, SparkleIcon, StarIcon, CoinIcon, CheckIcon, ClockIcon } from '@/components/icons'

interface TaskDetailsModalProps {
  show: boolean
  task: any
  onClose: () => void
  onComplete: (taskId: string) => void
  isCompleted: boolean
  isPending: boolean
  completingTask: string | null
  formatMoney: (amount: number) => string
}

export default function TaskDetailsModal({
  show, task, onClose, onComplete, isCompleted, isPending, completingTask, formatMoney
}: TaskDetailsModalProps) {
  if (!show || !task) return null

  const isQuran = task.task_type === 'quran'
  const isDua = task.task_type === 'dua'
  const isStory = task.story_content
  const hasContent = isQuran || isDua || isStory || task.custom_content_text

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-full md:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
            style={{ background: 'var(--ghrs-bg-card)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4" style={{ borderBottom: '1px solid var(--ghrs-border-default)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: isQuran ? 'var(--ghrs-green-50)' : isDua ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-tertiary)' }}>
                    {isQuran ? <QuranIcon size={24} color="var(--ghrs-green-600)" /> : isDua ? <SparkleIcon size={24} color="var(--ghrs-amber-600)" /> : <BookIcon size={24} color="var(--ghrs-text-secondary)" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{task.title}</h2>
                    <div className="flex items-center gap-2">
                      {isQuran && task.quran_action_type && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)' }}>
                          {task.quran_action_type === 'memorize' ? 'حفظ' : 'قراءة'}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        {task.frequency === 'daily' ? 'يومي' : task.frequency === 'weekly' ? 'أسبوعي' : task.frequency === 'monthly' ? 'شهري' : 'مرة واحدة'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>✕</button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Description */}
              {task.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>التوجيهات:</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ghrs-text-primary)' }}>{task.description}</p>
                </div>
              )}

              {/* Quran/Dua Content */}
              {hasContent && (
                <div className="mb-4 p-5 rounded-2xl text-right" style={{
                  background: isQuran ? 'linear-gradient(135deg, var(--ghrs-green-50), var(--ghrs-green-100))' : 'linear-gradient(135deg, var(--ghrs-amber-50), var(--ghrs-amber-100))',
                  border: `1px solid ${isQuran ? 'var(--ghrs-green-200)' : 'var(--ghrs-amber-200)'}`,
                }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: isQuran ? 'var(--ghrs-green-700)' : 'var(--ghrs-amber-700)' }}>
                    {isQuran ? 'النص القرآني:' : isDua ? 'الدعاء:' : 'المحتوى:'}
                  </h3>
                  <p style={{
                    fontFamily: "'Scheherazade New', 'Amiri', serif",
                    fontSize: '1.4rem',
                    lineHeight: '2.4',
                    color: 'var(--ghrs-text-primary)',
                  }}>
                    {task.custom_content_text || task.story_content}
                  </p>
                </div>
              )}

              {/* Rewards */}
              <div className="flex items-center gap-4 mb-6 p-4 rounded-xl" style={{ background: 'var(--ghrs-bg-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <StarIcon size={20} color="var(--ghrs-amber-600)" />
                  <span className="font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>{task.xp_reward} XP</span>
                </div>
                {task.money_reward > 0 && (
                  <div className="flex items-center gap-2">
                    <CoinIcon size={20} color="var(--ghrs-green-600)" />
                    <span className="font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{formatMoney(task.money_reward)}</span>
                  </div>
                )}
              </div>

              {/* Complete Button */}
              <button
                onClick={() => onComplete(task.id)}
                disabled={isCompleted || isPending || completingTask === task.id}
                className="w-full py-4 rounded-2xl text-lg font-bold transition-all"
                style={{
                  background: isCompleted ? 'var(--ghrs-green-500)' : isPending ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)',
                  color: 'white',
                  opacity: isCompleted || isPending || completingTask === task.id ? 0.7 : 1,
                }}
              >
                {isCompleted ? <><CheckIcon size={20} className="inline" /> تم الإنجاز!</> : isPending ? <><ClockIcon size={20} className="inline" /> بانتظار موافقة الوالد</> : completingTask === task.id ? 'جاري...' : 'أنجزت المهمة!'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
