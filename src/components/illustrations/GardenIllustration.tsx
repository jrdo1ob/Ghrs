import React from "react";

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const GardenIllustration: React.FC<IllustrationProps> = ({
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
    {/* Sky background */}
    <rect x="0" y="0" width="200" height="200" fill="#f0fdf4" rx="16" />

    {/* Sun */}
    <circle cx="160" cy="40" r="25" fill="#f59e0b" opacity="0.9" />
    <circle cx="160" cy="40" r="20" fill="#fbbf24" />
    {/* Sun rays */}
    <line x1="160" y1="10" x2="160" y2="5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <line x1="160" y1="70" x2="160" y2="75" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <line x1="130" y1="40" x2="125" y2="40" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <line x1="190" y1="40" x2="195" y2="40" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <line x1="140" y1="20" x2="136" y2="16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <line x1="180" y1="20" x2="184" y2="16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <line x1="140" y1="60" x2="136" y2="64" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <line x1="180" y1="60" x2="184" y2="64" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

    {/* Clouds */}
    <g opacity="0.8">
      <ellipse cx="45" cy="35" rx="20" ry="12" fill="white" />
      <ellipse cx="35" cy="30" rx="15" ry="10" fill="white" />
      <ellipse cx="55" cy="30" rx="15" ry="10" fill="white" />
    </g>
    <g opacity="0.6">
      <ellipse cx="110" cy="25" rx="15" ry="8" fill="white" />
      <ellipse cx="105" cy="22" rx="10" ry="7" fill="white" />
      <ellipse cx="118" cy="22" rx="10" ry="7" fill="white" />
    </g>

    {/* Ground */}
    <path d="M0 160 Q50 150 100 155 Q150 160 200 150 L200 200 L0 200 Z" fill="#22c55e" opacity="0.3" />
    <path d="M0 170 Q50 165 100 168 Q150 172 200 165 L200 200 L0 200 Z" fill="#22c55e" opacity="0.2" />

    {/* Main sprout/tree */}
    <line x1="100" y1="160" x2="100" y2="90" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
    {/* Main canopy */}
    <ellipse cx="100" cy="75" rx="30" ry="22" fill="#22c55e" opacity="0.8" />
    <ellipse cx="100" cy="70" rx="25" ry="18" fill="#4ade80" opacity="0.6" />

    {/* Left small tree */}
    <line x1="50" y1="165" x2="50" y2="120" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="50" cy="110" rx="18" ry="14" fill="#22c55e" opacity="0.7" />
    <ellipse cx="50" cy="107" rx="14" ry="10" fill="#4ade80" opacity="0.5" />

    {/* Right small tree */}
    <line x1="150" y1="160" x2="150" y2="115" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="150" cy="105" rx="18" ry="14" fill="#22c55e" opacity="0.7" />
    <ellipse cx="150" cy="102" rx="14" ry="10" fill="#4ade80" opacity="0.5" />

    {/* Small flowers */}
    <circle cx="30" cy="175" r="4" fill="#f59e0b" opacity="0.8" />
    <circle cx="30" cy="175" r="2" fill="#fbbf24" />
    <circle cx="70" cy="178" r="3" fill="#ef4444" opacity="0.7" />
    <circle cx="130" cy="176" r="3.5" fill="#a855f7" opacity="0.7" />
    <circle cx="170" cy="172" r="3" fill="#f59e0b" opacity="0.8" />

    {/* Butterfly */}
    <g transform="translate(140, 55)">
      <ellipse cx="0" cy="0" rx="6" ry="4" fill="#a855f7" opacity="0.6" transform="rotate(-30)" />
      <ellipse cx="0" cy="0" rx="6" ry="4" fill="#a855f7" opacity="0.6" transform="rotate(30)" />
      <ellipse cx="0" cy="0" rx="3" ry="2" fill="#c084fc" opacity="0.8" />
    </g>

    {/* Small birds */}
    <path d="M25 50 Q30 45 35 50" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M175 45 Q180 40 185 45" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

export default GardenIllustration;
