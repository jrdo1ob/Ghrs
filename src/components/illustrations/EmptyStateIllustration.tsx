import React from "react";

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const EmptyStateIllustration: React.FC<IllustrationProps> = ({
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
    <rect x="0" y="0" width="200" height="200" fill="#f8fafc" rx="16" />

    {/* Cloud shapes */}
    <g opacity="0.3">
      <ellipse cx="60" cy="80" rx="30" ry="18" fill="#cbd5e1" />
      <ellipse cx="45" cy="75" rx="22" ry="14" fill="#cbd5e1" />
      <ellipse cx="75" cy="75" rx="22" ry="14" fill="#cbd5e1" />
    </g>
    <g opacity="0.2">
      <ellipse cx="145" cy="70" rx="25" ry="15" fill="#cbd5e1" />
      <ellipse cx="135" cy="66" rx="18" ry="12" fill="#cbd5e1" />
      <ellipse cx="155" cy="66" rx="18" ry="12" fill="#cbd5e1" />
    </g>

    {/* Main empty box/container */}
    <rect x="55" y="95" width="90" height="70" rx="8" fill="#e2e8f0" opacity="0.5" />
    <rect x="55" y="95" width="90" height="70" rx="8" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

    {/* Open lid */}
    <path d="M50 95 L100 75 L150 95" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
    <line x1="50" y1="95" x2="55" y2="95" stroke="#94a3b8" strokeWidth="2" />
    <line x1="150" y1="95" x2="145" y2="95" stroke="#94a3b8" strokeWidth="2" />

    {/* Question mark inside */}
    <text
      x="100"
      y="140"
      textAnchor="middle"
      fontSize="36"
      fontWeight="bold"
      fill="#94a3b8"
      opacity="0.6"
    >
      ?
    </text>

    {/* Floating elements */}
    <g opacity="0.4">
      {/* Paper/document */}
      <rect x="85" y="120" width="15" height="20" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="88" y1="126" x2="97" y2="126" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="88" y1="130" x2="95" y2="130" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="88" y1="134" x2="97" y2="134" stroke="#cbd5e1" strokeWidth="1" />
    </g>

    {/* Small stars */}
    <g fill="#f59e0b" opacity="0.5">
      <path d="M35 50 L37 46 L39 50 L43 52 L39 54 L37 58 L35 54 L31 52 Z" />
      <path d="M160 45 L162 42 L164 45 L167 46 L164 48 L162 51 L160 48 L157 46 Z" />
    </g>

    {/* Dotted trail */}
    <circle cx="40" cy="150" r="2" fill="#cbd5e1" opacity="0.4" />
    <circle cx="50" cy="145" r="1.5" fill="#cbd5e1" opacity="0.3" />
    <circle cx="58" cy="142" r="1" fill="#cbd5e1" opacity="0.2" />

    <circle cx="160" cy="155" r="2" fill="#cbd5e1" opacity="0.4" />
    <circle cx="150" cy="150" r="1.5" fill="#cbd5e1" opacity="0.3" />
    <circle cx="142" cy="147" r="1" fill="#cbd5e1" opacity="0.2" />

    {/* Sprout growing from empty box */}
    <line x1="100" y1="95" x2="100" y2="78" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M100 78 Q95 72 100 75" fill="#22c55e" stroke="none" />
    <path d="M100 80 Q105 74 100 77" fill="#4ade80" stroke="none" />
    <circle cx="100" cy="76" r="2" fill="#22c55e" opacity="0.6" />
  </svg>
);

export default EmptyStateIllustration;
