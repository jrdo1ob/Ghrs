'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface StoryReaderProps {
  show: boolean
  title: string
  content: string
  storyType?: string
  storyUrl?: string
  onClose: () => void
  onComplete: () => void
}

export default function StoryReader({ show, title, content, storyType, storyUrl, onClose, onComplete }: StoryReaderProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [finished, setFinished] = useState(false)

  // Split content into pages (by paragraphs or sections)
  const pages = content ? content.split('\n').filter(p => p.trim()) : [content]

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
    } else {
      setFinished(true)
    }
  }

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleComplete = () => {
    onComplete()
    onClose()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="relative w-full max-w-lg bg-[var(--ghrs-bg-card)] rounded-3xl overflow-hidden shadow-2xl"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between" style={{ background: 'var(--ghrs-green-500)' }}>
              <button onClick={onClose} className="text-white text-2xl">✕</button>
              <h3 className="text-lg font-bold text-white truncate px-2">📖 {title}</h3>
              <span className="text-sm text-white/80">{currentPage + 1}/{pages.length}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1" style={{ background: 'var(--ghrs-bg-tertiary)' }}>
              <motion.div
                className="h-full"
                style={{ background: 'var(--ghrs-green-500)' }}
                animate={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
              />
            </div>

            {/* Content area */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
              {!finished ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {storyType === 'image' && storyUrl ? (
                      <div className="text-center mb-4">
                        <img src={storyUrl} alt={title} className="rounded-xl max-h-60 mx-auto" />
                      </div>
                    ) : null}

                    <p className="text-lg leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ghrs-text-primary)' }}>
                      {pages[currentPage]}
                    </p>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ghrs-green-700)' }}>
                    أحسنت! وصلت لنهاية القصة
                  </h3>
                  <p className="text-sm mb-6" style={{ color: 'var(--ghrs-text-secondary)' }}>
                    يمكنك الآن الضغط على "أنجزت" لإتمام المهمة
                  </p>
                  <button
                    onClick={handleComplete}
                    className="px-8 py-3 rounded-xl text-lg font-bold text-white"
                    style={{ background: 'var(--ghrs-green-600)' }}
                  >
                    ✅ أكملت القراءة! أنجزت
                  </button>
                </motion.div>
              )}
            </div>

            {/* Navigation */}
            {!finished && (
              <div className="p-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--ghrs-border-default)' }}>
                <button
                  onClick={handlePrev}
                  disabled={currentPage === 0}
                  className="px-4 py-2 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: currentPage === 0 ? 'var(--ghrs-bg-tertiary)' : 'var(--ghrs-bg-secondary)',
                    color: currentPage === 0 ? 'var(--ghrs-text-tertiary)' : 'var(--ghrs-text-primary)',
                  }}
                >
                  السابق
                </button>

                {/* Page dots */}
                <div className="flex gap-1">
                  {pages.map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{
                        background: i === currentPage ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)',
                        transform: i === currentPage ? 'scale(1.3)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ background: 'var(--ghrs-green-500)' }}
                >
                  {currentPage < pages.length - 1 ? 'التالي' : 'النهاية 📖'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
