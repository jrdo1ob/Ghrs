'use client';

import { motion } from 'framer-motion';

interface AnimatedXPBarProps {
  current: number;
  max: number;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AnimatedXPBar({
  current,
  max,
  showLabel = true,
  className = '',
  size = 'md',
}: AnimatedXPBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const height = size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5 text-sm">
          <span className="font-semibold text-ghrs-text-secondary">
            XP
          </span>
          <span className="font-bold text-ghrs-brand-gold">
            {current.toLocaleString()} / {max.toLocaleString()}
          </span>
        </div>
      )}
      <div className={`ghrs-xp-bar ${height}`}>
        <motion.div
          className="ghrs-xp-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
