'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GiftsIcon } from '@/components/icons'

export default function AppDownloadBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has closed the banner before
    const bannerClosed = localStorage.getItem('ghrs-banner-closed')
    if (!bannerClosed) {
      setShowBanner(true)
    }
  }, [])

  const handleClose = () => {
    setShowBanner(false)
    localStorage.setItem('ghrs-banner-closed', 'true')
  }

  if (!showBanner) return null

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 p-3"
          style={{ background: 'linear-gradient(135deg, var(--ghrs-green-600), var(--ghrs-green-700))' }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <GiftsIcon size={20} color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">حمّل تطبيق غرس للتجربة الأفضل!</p>
                <p className="text-xs text-white opacity-80 hidden sm:block">تطبيق أندرويد أصلي مع شاشة بدء وتجربة سلسة</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="/app-release.apk"
                download
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={{ background: 'white', color: 'var(--ghrs-green-700)' }}
              >
                تحميل
              </a>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'white', background: 'rgba(255,255,255,0.1)' }}
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
