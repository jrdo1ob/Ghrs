'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

const variantConfig = {
  danger: {
    icon: '🗑️',
    confirmBg: 'bg-[var(--ghrs-red-600)]',
    confirmHover: 'hover:bg-[var(--ghrs-red-700)]',
    iconBg: 'bg-[var(--ghrs-red-50)]',
  },
  warning: {
    icon: '⚠️',
    confirmBg: 'bg-[var(--ghrs-amber-500)]',
    confirmHover: 'hover:bg-[var(--ghrs-amber-600)]',
    iconBg: 'bg-[var(--ghrs-amber-50)]',
  },
  info: {
    icon: 'ℹ️',
    confirmBg: 'bg-[var(--ghrs-blue-600)]',
    confirmHover: 'hover:bg-[var(--ghrs-blue-700)]',
    iconBg: 'bg-[var(--ghrs-blue-50)]',
  },
}

export default function ConfirmDialog({
  show,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-[var(--ghrs-bg-card)] rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center text-4xl mb-4`}>
                {config.icon}
              </div>

              <h3
                className="text-lg font-bold mb-2"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                {title}
              </h3>

              <p
                className="text-sm mb-6"
                style={{ color: 'var(--ghrs-text-secondary)' }}
              >
                {message}
              </p>

              <div className="flex gap-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors"
                  style={{
                    background: 'var(--ghrs-bg-tertiary)',
                    color: 'var(--ghrs-text-primary)',
                  }}
                >
                  {cancelText}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors ${config.confirmBg} ${config.confirmHover}`}
                >
                  {confirmText}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
