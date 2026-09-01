'use client';

import { motion } from 'framer-motion';

interface GHRSLogoProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export default function GHRSLogo({ size = 48, animate = true, className = '' }: GHRSLogoProps) {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover={animate ? { scale: 1.05 } : undefined}
      whileTap={animate ? { scale: 0.95 } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#logoGradient)"
          initial={animate ? { scale: 0 } : false}
          animate={animate ? { scale: 1 } : false}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
        />

        {/* Arabic letter غ stylized as sprout */}
        <motion.g
          initial={animate ? { y: 10, opacity: 0 } : false}
          animate={animate ? { y: 0, opacity: 1 } : false}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Stem */}
          <path
            d="M50 75 C50 75, 50 45, 50 40"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left leaf */}
          <motion.path
            d="M50 55 C40 50, 35 40, 40 35 C45 30, 50 40, 50 55"
            fill="#bbf7d0"
            initial={animate ? { scale: 0, originX: '50px', originY: '55px' } : false}
            animate={animate ? { scale: 1 } : false}
            transition={{ duration: 0.4, delay: 0.5 }}
          />
          {/* Right leaf */}
          <motion.path
            d="M50 48 C60 43, 65 33, 60 28 C55 23, 50 33, 50 48"
            fill="#86efac"
            initial={animate ? { scale: 0, originX: '50px', originY: '48px' } : false}
            animate={animate ? { scale: 1 } : false}
            transition={{ duration: 0.4, delay: 0.7 }}
          />
          {/* Top bud */}
          <motion.circle
            cx="50"
            cy="38"
            r="5"
            fill="#4ade80"
            initial={animate ? { scale: 0 } : false}
            animate={animate ? { scale: [0, 1.2, 1] } : false}
            transition={{ duration: 0.5, delay: 0.9 }}
          />
        </motion.g>

        {/* Glow effect */}
        <motion.circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="url(#glowGradient)"
          strokeWidth="2"
          initial={animate ? { opacity: 0 } : false}
          animate={animate ? { opacity: [0, 0.5, 0] } : false}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />

        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}
