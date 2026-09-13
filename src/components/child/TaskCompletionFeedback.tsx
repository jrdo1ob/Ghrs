'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StarIcon, CoinIcon, CheckIcon, ClockIcon } from '@/components/icons'

interface TaskCompletionFeedbackProps {
  show: boolean
  taskName: string
  xpEarned: number
  moneyEarned: number
  needsApproval: boolean
  onClose: () => void
  formatMoney: (amount: number) => string
}

export default function TaskCompletionFeedback({
  show, taskName, xpEarned, moneyEarned, needsApproval, onClose, formatMoney
}: TaskCompletionFeedbackProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="rounded-3xl p-8 text-center max-w-sm w-full"
            style={{ background: 'var(--ghrs-bg-card)', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success/Status Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
              className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: needsApproval ? 'var(--ghrs-amber-100)' : 'var(--ghrs-green-100)' }}
            >
              {needsApproval
                ? <ClockIcon size={36} color="var(--ghrs-amber-600)" />
                : <CheckIcon size={36} color="var(--ghrs-green-600)" />
              }
            </motion.div>

            {/* Title */}
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-xl font-extrabold mb-2"
              style={{ color: 'var(--ghrs-text-primary)' }}
            >
              {needsApproval ? 'تم الإرسال! ⏳' : 'أحسنت! 🎉'}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm mb-5"
              style={{ color: 'var(--ghrs-text-secondary)' }}
            >
              {needsApproval
                ? 'تم إرسال المهمة للموافقة'
                : taskName
              }
            </motion.p>

            {/* Rewards */}
            {!needsApproval && (xpEarned > 0 || moneyEarned > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="flex items-center justify-center gap-3 mb-6"
              >
                {xpEarned > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={{ background: 'var(--ghrs-amber-50)', border: '1.5px solid var(--ghrs-amber-200)' }}>
                    <StarIcon size={18} color="var(--ghrs-amber-600)" />
                    <span className="text-base font-extrabold" style={{ color: 'var(--ghrs-amber-600)' }}>+{xpEarned}</span>
                  </div>
                )}
                {moneyEarned > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={{ background: 'var(--ghrs-green-50)', border: '1.5px solid var(--ghrs-green-200)' }}>
                    <CoinIcon size={18} color="var(--ghrs-green-600)" />
                    <span className="text-base font-extrabold" style={{ color: 'var(--ghrs-green-600)' }}>+{formatMoney(moneyEarned)}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: needsApproval ? 'var(--ghrs-amber-500)' : 'var(--ghrs-green-600)' }}
            >
              {needsApproval ? 'حسناً' : 'ممتاز!'}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
