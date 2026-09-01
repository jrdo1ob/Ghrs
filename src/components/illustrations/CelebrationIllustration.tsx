import React from "react";

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const CelebrationIllustration: React.FC<IllustrationProps> = ({
  size = 200,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    className={`inline-block flex-shrink-0 ${className}`}
  >
    {/* Background */}
    <rect x="0" y="0" width="200" height="200" fill="#fef3c7" rx="16" />

    {/* Confetti bursts */}
    <g>
      {/* Left burst */}
      <circle cx="30" cy="40" r="3" fill="#ef4444" opacity="0.8" />
      <circle cx="20" cy="60" r="2.5" fill="#22c55e" opacity="0.7" />
      <circle cx="40" cy="30" r="2" fill="#a855f7" opacity="0.6" />
      <circle cx="15" cy="45" r="2" fill="#f59e0b" opacity="0.7" />
      <rect x="35" y="50" width="4" height="4" fill="#3b82f6" opacity="0.6" transform="rotate(45, 37, 52)" />
      <rect x="25" y="35" width="3" height="3" fill="#ef4444" opacity="0.5" transform="rotate(30, 26, 36)" />

      {/* Right burst */}
      <circle cx="170" cy="35" r="3" fill="#22c55e" opacity="0.8" />
      <circle cx="180" cy="55" r="2.5" fill="#f59e0b" opacity="0.7" />
      <circle cx="160" cy="25" r="2" fill="#a855f7" opacity="0.6" />
      <circle cx="185" cy="40" r="2" fill="#ef4444" opacity="0.7" />
      <rect x="165" y="45" width="4" height="4" fill="#3b82f6" opacity="0.6" transform="rotate(45, 167, 47)" />
      <rect x="175" y="30" width="3" height="3" fill="#22c55e" opacity="0.5" transform="rotate(30, 176, 31)" />
    </g>

    {/* Streamers */}
    <path d="M30 80 Q50 100 40 130 Q35 150 50 160" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
    <path d="M170 80 Q150 100 160 130 Q165 150 150 160" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
    <path d="M60 70 Q80 90 70 120 Q65 140 80 150" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
    <path d="M140 70 Q120 90 130 120 Q135 140 120 150" stroke="#a855f7" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />

    {/* Central trophy/celebration */}
    <g transform="translate(100, 100)">
      {/* Trophy base */}
      <rect x="-25" y="30" width="50" height="8" rx="4" fill="#f59e0b" />
      <rect x="-15" y="22" width="30" height="12" rx="3" fill="#fbbf24" />

      {/* Trophy cup */}
      <path d="M-20 -10 L-15 20 L15 20 L20 -10 Z" fill="#f59e0b" />
      <path d="M-20 -10 L-15 20 L15 20 L20 -10 Z" stroke="#d97706" strokeWidth="2" />

      {/* Trophy handles */}
      <path d="M-20 -5 Q-30 -5 -30 5 Q-30 12 -20 12" stroke="#f59e0b" strokeWidth="3" fill="none" />
      <path d="M20 -5 Q30 -5 30 5 Q30 12 20 12" stroke="#f59e0b" strokeWidth="3" fill="none" />

      {/* Star on trophy */}
      <path d="M0 -2 L2 -6 L6 -6 L3 -3 L4 1 L0 -2 L-4 1 L-3 -3 L-6 -6 L-2 -6 Z" fill="#fbbf24" />

      {/* Shine effect */}
      <path d="M-8 0 L-6 -8" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </g>

    {/* Floating stars */}
    <g fill="#f59e0b" opacity="0.7">
      <path d="M50 55 L52 51 L54 55 L58 57 L54 59 L52 63 L50 59 L46 57 Z" />
      <path d="M150 50 L152 47 L154 50 L157 51 L154 53 L152 56 L150 53 L147 51 Z" />
      <path d="M80 40 L81 38 L82 40 L84 41 L82 42 L81 44 L80 42 L78 41 Z" />
      <path d="M120 35 L121 33 L122 35 L124 36 L122 37 L121 39 L120 37 L118 36 Z" />
    </g>

    {/* Sparkle effects */}
    <g stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
      <line x1="45" y1="100" x2="45" y2="92" />
      <line x1="41" y1="96" x2="49" y2="96" />

      <line x1="155" y1="95" x2="155" y2="87" />
      <line x1="151" y1="91" x2="159" y2="91" />
    </g>

    {/* Bottom confetti */}
    <circle cx="30" cy="180" r="2" fill="#a855f7" opacity="0.5" />
    <circle cx="50" cy="185" r="1.5" fill="#22c55e" opacity="0.4" />
    <circle cx="70" cy="182" r="2" fill="#f59e0b" opacity="0.5" />
    <circle cx="130" cy="182" r="2" fill="#ef4444" opacity="0.5" />
    <circle cx="150" cy="185" r="1.5" fill="#3b82f6" opacity="0.4" />
    <circle cx="170" cy="180" r="2" fill="#a855f7" opacity="0.5" />
    <rect x="90" y="188" width="3" height="3" fill="#22c55e" opacity="0.4" transform="rotate(45, 91, 189)" />
    <rect x="110" y="186" width="3" height="3" fill="#f59e0b" opacity="0.4" transform="rotate(30, 111, 187)" />
  </svg>
);

export default CelebrationIllustration;
