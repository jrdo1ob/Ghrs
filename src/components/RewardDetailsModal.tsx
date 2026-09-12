'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { GiftsIcon, StarIcon, CoinIcon, CheckIcon, LockIcon } from '@/components/icons'

interface RewardDetailsModalProps {
  show: boolean
  gift: any
  onClose: () => void
  onRedeem: (giftId: string) => void
  childXp: number
  childMoney: number
  redeeming: string | null
  formatMoney: (amount: number) => string
}

export default function RewardDetailsModal({
  show, gift, onClose, onRedeem, childXp, childMoney, redeeming, formatMoney
}: RewardDetailsModalProps) {
  if (!show || !gift) return null

  const canAffordXp = childXp >= gift.cost_xp
  const canAffordMoney = gift.cost_money <= 0 || childMoney >= gift.cost_money
  const canAfford = canAffordXp && canAffordMoney

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
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--ghrs-purple-50)' }}>
                    <GiftsIcon size={28} color="var(--ghrs-purple-600)" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{gift.title}</h2>
                    {gift.description && <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{gift.description}</p>}
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>✕</button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Cost */}
              <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--ghrs-bg-tertiary)' }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ghrs-text-secondary)' }}>التكلفة:</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <StarIcon size={24} color={canAffordXp ? 'var(--ghrs-amber-600)' : 'var(--ghrs-red-500)'} />
                    <div>
                      <p className="text-xl font-bold" style={{ color: canAffordXp ? 'var(--ghrs-amber-600)' : 'var(--ghrs-red-500)' }}>{gift.cost_xp}</p>
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>نقطة XP</p>
                    </div>
                  </div>
                  {gift.cost_money > 0 && (
                    <div className="flex items-center gap-2">
                      <CoinIcon size={24} color={canAffordMoney ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-500)'} />
                      <div>
                        <p className="text-xl font-bold" style={{ color: canAffordMoney ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-500)' }}>{formatMoney(gift.cost_money)}</p>
                        <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>رصيد مالي</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Check */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: canAfford ? 'var(--ghrs-green-50)' : 'var(--ghrs-red-50)', border: `1px solid ${canAfford ? 'var(--ghrs-green-200)' : 'var(--ghrs-red-200)'}` }}>
                <p className="text-sm font-bold" style={{ color: canAfford ? 'var(--ghrs-green-700)' : 'var(--ghrs-red-600)' }}>
                  {canAfford ? '✓ رصيدك كافٍ لطلب هذه المكافأة!' : '✗ رصيدك غير كافٍ لطلب هذه المكافأة'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>
                  رصيدك الحالي: {childXp} XP{gift.cost_money > 0 && ` + ${formatMoney(childMoney)}`}
                </p>
              </div>

              {/* Redeem Button */}
              <button
                onClick={() => onRedeem(gift.id)}
                disabled={!canAfford || redeeming === gift.id}
                className="w-full py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-2"
                style={{
                  background: canAfford ? 'var(--ghrs-purple-600)' : 'var(--ghrs-bg-tertiary)',
                  color: canAfford ? 'white' : 'var(--ghrs-text-tertiary)',
                  opacity: redeeming === gift.id ? 0.7 : 1,
                }}
              >
                {redeeming === gift.id ? 'جاري الطلب...' : canAfford ? <><GiftsIcon size={20} /> طلب المكافأة</> : <><LockIcon size={20} /> رصيد غير كافٍ</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
