'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface CelebrationModalProps {
  show: boolean
  level: number
  levelName: string
  levelEmoji: string
  onClose: () => void
}

export default function CelebrationModal({ show, level, levelName, levelEmoji, onClose }: CelebrationModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        >
          {/* Confetti particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: ['#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'][i % 5],
                left: `${Math.random() * 100}%`,
                top: `-5%`,
              }}
              animate={{
                y: ['0vh', '100vh'],
                x: [0, (Math.random() - 0.5) * 200],
                rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                opacity: [1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Main content */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative bg-[var(--ghrs-bg-card)] rounded-3xl p-8 md:p-12 text-center max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl opacity-20" style={{
              background: 'radial-gradient(circle at center, var(--ghrs-amber-300) 0%, transparent 70%)'
            }} />

            {/* Emoji */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              className="relative text-8xl md:text-9xl mb-4"
            >
              {levelEmoji}
            </motion.div>

            {/* Stars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="relative text-3xl mb-4"
            >
              ⭐⭐⭐
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="relative text-2xl md:text-3xl font-extrabold mb-2"
              style={{ color: 'var(--ghrs-green-700)' }}
            >
              مبروك! 🎉
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="relative text-lg font-bold mb-1"
              style={{ color: 'var(--ghrs-text-primary)' }}
            >
              وصلت للمستوى {level}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative text-xl font-bold mb-6"
              style={{ color: 'var(--ghrs-amber-600)' }}
            >
              {levelName} {levelEmoji}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="relative text-sm mb-6"
              style={{ color: 'var(--ghrs-text-secondary)' }}
            >
              استمر في الإنجاز! حديقتك تزداد جمالاً مع كل مهمة تكملها 💪
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="relative px-8 py-3 rounded-xl text-lg font-bold text-white"
              style={{ background: 'var(--ghrs-green-600)' }}
            >
              أكمل المغامرة! 🚀
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
