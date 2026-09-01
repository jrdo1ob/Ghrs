'use client'

import { useState, useEffect } from 'react'
import { LeafIcon } from '@/components/icons'

export default function OfflineHandler() {
  const [isOffline, setIsOffline] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setIsRetrying(true)
    setTimeout(() => {
      if (navigator.onLine) {
        setIsOffline(false)
      } else {
        setIsRetrying(false)
      }
    }, 2000)
  }

  if (!isOffline) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div className="text-center max-w-sm">
        <div className="mb-6">
          <LeafIcon size={80} color="var(--ghrs-green-500)" className="mx-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>لا يوجد اتصال بالإنترنت</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--ghrs-text-secondary)' }}>
          يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى
        </p>
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-8 py-3 rounded-xl text-lg font-bold transition-all"
          style={{
            background: 'var(--ghrs-green-600)',
            color: 'white',
            opacity: isRetrying ? 0.7 : 1
          }}
        >
          {isRetrying ? 'جاري المحاولة...' : 'إعادة المحاولة'}
        </button>
      </div>
    </div>
  )
}
