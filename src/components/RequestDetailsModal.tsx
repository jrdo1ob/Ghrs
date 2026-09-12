'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { GiftsIcon, StarIcon, CoinIcon, ClockIcon } from '@/components/icons'

interface RequestDetailsModalProps {
  show: boolean
  request: any
  onClose: () => void
  formatMoney: (amount: number) => string
}

const statusConfig: Record<string, { text: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { text: 'بانتظار الموافقة', color: 'var(--ghrs-amber-700)', bg: 'var(--ghrs-amber-50)', icon: <ClockIcon size={16} color="var(--ghrs-amber-700)" /> },
  approved: { text: 'تمت الموافقة', color: 'var(--ghrs-green-600)', bg: 'var(--ghrs-green-50)', icon: null },
  rejected: { text: 'تم الرفض', color: 'var(--ghrs-red-600)', bg: 'var(--ghrs-red-50)', icon: null },
  revoked: { text: 'تم سحب الموافقة', color: 'var(--ghrs-purple-600)', bg: 'var(--ghrs-purple-50)', icon: null },
}

export default function RequestDetailsModal({ show, request, onClose, formatMoney }: RequestDetailsModalProps) {
  if (!show || !request) return null

  const sc = statusConfig[request.status] || statusConfig.pending

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
            className="w-full md:max-w-sm max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
            style={{ background: 'var(--ghrs-bg-card)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ghrs-border-default)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--ghrs-purple-50)' }}>
                  <GiftsIcon size={24} color="var(--ghrs-purple-600)" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{request.gift_name}</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>✕</button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5" style={{ background: sc.bg, color: sc.color }}>
                  {sc.icon} {sc.text}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {request.requested_xp != null && (
                  <div className="flex items-center gap-2">
                    <StarIcon size={18} color="var(--ghrs-amber-600)" />
                    <span className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{request.requested_xp} XP</span>
                  </div>
                )}
                {request.money_spent != null && request.money_spent > 0 && (
                  <div className="flex items-center gap-2">
                    <CoinIcon size={18} color="var(--ghrs-green-600)" />
                    <span className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{formatMoney(request.money_spent)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>
                    {new Date(request.date).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
