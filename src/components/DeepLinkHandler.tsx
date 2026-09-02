'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GiftsIcon } from '@/components/icons'

interface DeepLinkBannerProps {
  show: boolean
  onDismiss: () => void
}

function DeepLinkBanner({ show, onDismiss }: DeepLinkBannerProps) {
  if (!show) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] p-3"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <GiftsIcon size={20} color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">لتجربة أفضل وأسرع، افتح عبر تطبيق غرس</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="https://github.com/jrdo1ob/Ghrs/releases/latest/download/app-debug.apk"
                download
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={{ background: 'white', color: '#16a34a' }}
              >
                تحميل التطبيق
              </a>
              <button
                onClick={onDismiss}
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

export default function DeepLinkHandler() {
  const [showBanner, setShowBanner] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if running on mobile
    const userAgent = navigator.userAgent
    const mobile = /Android|iPhone|iPad|iPod/i.test(userAgent)
    setIsMobile(mobile)

    // Check if banner was dismissed
    const bannerDismissed = localStorage.getItem('ghrs-deeplink-banner-dismissed')
    if (bannerDismissed) return

    if (mobile) {
      // Try to open app via custom scheme
      const currentPath = window.location.pathname + window.location.search
      const appSchemeUrl = `ghrs://${currentPath.replace(/^\//, '')}`

      // Attempt to open the app
      window.location.href = appSchemeUrl

      // If app doesn't open within 1.2 seconds, show banner
      setTimeout(() => {
        setShowBanner(true)
      }, 1200)
    }
  }, [])

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('ghrs-deeplink-banner-dismissed', 'true')
  }

  return <DeepLinkBanner show={showBanner} onDismiss={handleDismiss} />
}
