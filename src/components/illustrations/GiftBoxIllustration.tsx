import React from "react";

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const GiftBoxIllustration: React.FC<IllustrationProps> = ({
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

    {/* Gift box body */}
    <rect x="45" y="90" width="110" height="80" rx="8" fill="#f59e0b" />
    <rect x="45" y="90" width="110" height="80" rx="8" stroke="#d97706" strokeWidth="3" />

    {/* Ribbon vertical */}
    <rect x="92" y="90" width="16" height="80" fill="#ef4444" />
    <rect x="92" y="90" width="16" height="80" stroke="#dc2626" strokeWidth="2" />

    {/* Ribbon horizontal */}
    <rect x="45" y="115" width="110" height="14" fill="#ef4444" />
    <rect x="45" y="115" width="110" height="14" stroke="#dc2626" strokeWidth="2" />

    {/* Gift box lid */}
    <rect x="35" y="70" width="130" height="25" rx="6" fill="#fbbf24" />
    <rect x="35" y="70" width="130" height="25" rx="6" stroke="#d97706" strokeWidth="3" />

    {/* Lid ribbon */}
    <rect x="92" y="70" width="16" height="25" fill="#ef4444" />
    <rect x="92" y="70" width="16" height="25" stroke="#dc2626" strokeWidth="2" />

    {/* Bow */}
    <ellipse cx="85" cy="65" rx="15" ry="10" fill="#ef4444" transform="rotate(-20, 85, 65)" />
    <ellipse cx="115" cy="65" rx="15" ry="10" fill="#ef4444" transform="rotate(20, 115, 65)" />
    <ellipse cx="85" cy="65" rx="15" ry="10" fill="#f87171" transform="rotate(-20, 85, 65)" opacity="0.5" />
    <ellipse cx="115" cy="65" rx="15" ry="10" fill="#f87171" transform="rotate(20, 115, 65)" opacity="0.5" />
    <circle cx="100" cy="62" r="8" fill="#dc2626" />
    <circle cx="100" cy="62" r="5" fill="#ef4444" />

    {/* Sparkles */}
    <g fill="#22c55e">
      <circle cx="30" cy="40" r="4" opacity="0.8" />
      <circle cx="170" cy="35" r="3" opacity="0.7" />
      <circle cx="25" cy="100" r="2.5" opacity="0.6" />
      <circle cx="175" cy="110" r="3.5" opacity="0.7" />
      <circle cx="40" cy="150" r="2" opacity="0.5" />
      <circle cx="160" cy="155" r="2.5" opacity="0.6" />
    </g>

    {/* Star sparkles */}
    <g fill="#f59e0b">
      <path d="M20 60 L22 56 L24 60 L28 62 L24 64 L22 68 L20 64 L16 62 Z" opacity="0.8" />
      <path d="M175 70 L177 67 L179 70 L182 71 L179 73 L177 76 L175 73 L172 71 Z" opacity="0.7" />
      <path d="M15 130 L17 127 L19 130 L22 131 L19 133 L17 136 L15 133 L12 131 Z" opacity="0.6" />
    </g>

    {/* Small hearts */}
    <path d="M180 50 C180 48 182 46 184 48 C186 46 188 48 188 50 C188 53 184 56 184 56 C184 56 180 53 180 50 Z" fill="#ef4444" opacity="0.5" />
    <path d="M12 80 C12 78 14 76 16 78 C18 76 20 78 20 80 C20 83 16 86 16 86 C16 86 12 83 12 80 Z" fill="#f59e0b" opacity="0.5" />

    {/* Confetti dots */}
    <circle cx="50" cy="30" r="2" fill="#a855f7" opacity="0.6" />
    <circle cx="150" cy="25" r="2" fill="#22c55e" opacity="0.6" />
    <circle cx="80" cy="20" r="1.5" fill="#f59e0b" opacity="0.5" />
    <circle cx="120" cy="18" r="1.5" fill="#ef4444" opacity="0.5" />
  </svg>
);

export default GiftBoxIllustration;
