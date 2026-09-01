import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

const defaultClassName = "inline-block flex-shrink-0";

export const TasksIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${defaultClassName} ${className}`}
  >
    {/* Notepad body */}
    <rect x="4" y="4" width="16" height="18" rx="2" stroke="currentColor" fill="none" />
    {/* Notepad lines */}
    <line x1="8" y1="10" x2="16" y2="10" stroke="#92400e" strokeWidth="1.5" opacity="0.5" />
    <line x1="8" y1="13" x2="16" y2="13" stroke="#92400e" strokeWidth="1.5" opacity="0.5" />
    <line x1="8" y1="16" x2="14" y2="16" stroke="#92400e" strokeWidth="1.5" opacity="0.5" />
    {/* Sprout stem */}
    <path d="M12 4 V1" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    {/* Sprout leaves */}
    <path d="M12 1 Q14 2 13 4" fill="#22c55e" stroke="none" />
    <path d="M12 2 Q10 3 11 4" fill="#22c55e" stroke="none" />
  </svg>
);

export const GiftsIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${defaultClassName} ${className}`}
  >
    {/* Gift box */}
    <rect x="3" y="10" width="18" height="11" rx="1.5" stroke="currentColor" fill="none" />
    {/* Ribbon vertical */}
    <line x1="12" y1="10" x2="12" y2="21" stroke="#f59e0b" strokeWidth="2" />
    {/* Lid */}
    <rect x="2" y="6" width="20" height="4" rx="1" stroke="currentColor" fill="none" />
    {/* Ribbon bow */}
    <path d="M12 6 Q9 4 9 2.5" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
    <path d="M12 6 Q15 4 15 2.5" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
    {/* Sparkles */}
    <circle cx="5" cy="4" r="0.8" fill="#f59e0b" stroke="none" />
    <circle cx="19" cy="3" r="0.8" fill="#f59e0b" stroke="none" />
    <circle cx="17" cy="1.5" r="0.5" fill="#22c55e" stroke="none" />
    <path d="M20 6 L20.5 5 M20 4 L20.5 3" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const XPIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${defaultClassName} ${className}`}
  >
    {/* Glow effect */}
    <circle cx="12" cy="12" r="10" fill="#f59e0b" opacity="0.1" stroke="none" />
    {/* Star body */}
    <path
      d="M12 2 L14.5 9 L22 9.5 L16.5 14 L18 22 L12 18 L6 22 L7.5 14 L2 9.5 L9.5 9 Z"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Inner star glow */}
    <path
      d="M12 6 L13.5 10 L17.5 10.5 L14.5 13 L15 17 L12 15 L9 17 L9.5 13 L6.5 10.5 L10.5 10 Z"
      fill="#f59e0b"
      opacity="0.3"
      stroke="none"
    />
    {/* Sprout base */}
    <path d="M10 22 Q12 24 14 22" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="12" cy="22" r="1" fill="#22c55e" stroke="none" />
  </svg>
);

export const StreakIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${defaultClassName} ${className}`}
  >
    {/* Flame body */}
    <path
      d="M12 2 C12 2 6 8 6 14 C6 18 8.5 21 12 21 C15.5 21 18 18 18 14 C18 8 12 2 12 2Z"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="2"
    />
    {/* Inner flame */}
    <path
      d="M12 8 C12 8 9 12 9 15 C9 17 10 18.5 12 18.5 C14 18.5 15 17 15 15 C15 12 12 8 12 8Z"
      fill="#f59e0b"
      opacity="0.4"
      stroke="none"
    />
    {/* Energy sparkles */}
    <circle cx="8" cy="6" r="0.6" fill="#22c55e" stroke="none" />
    <circle cx="16" cy="5" r="0.6" fill="#22c55e" stroke="none" />
    <path d="M4 10 L3 9.5 M4 8 L3 8" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
    <path d="M20 10 L21 9.5 M20 8 L21 8" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const GardenIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${defaultClassName} ${className}`}
  >
    {/* Tree trunk */}
    <path d="M12 22 L12 12" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
    {/* Main canopy */}
    <ellipse cx="12" cy="8" rx="5" ry="4" fill="none" stroke="#22c55e" strokeWidth="2" />
    {/* Left branch */}
    <path d="M12 15 Q6 13 5 9" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="5" cy="8" r="2.5" fill="none" stroke="#22c55e" strokeWidth="1.5" />
    {/* Right branch */}
    <path d="M12 15 Q18 13 19 9" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="19" cy="8" r="2.5" fill="none" stroke="#22c55e" strokeWidth="1.5" />
    {/* Leaf details */}
    <path d="M10 6 Q9 4 11 5" fill="#22c55e" stroke="none" />
    <path d="M14 6 Q15 4 13 5" fill="#22c55e" stroke="none" />
    <path d="M12 5 Q12 3 12 5" fill="#22c55e" stroke="none" />
    {/* Ground */}
    <path d="M8 22 Q12 20 16 22" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

export const LogoIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${defaultClassName} ${className}`}
  >
    {/* Arabic letter غ stylized as sprout */}
    {/* Main curve of غ */}
    <path
      d="M7 8 Q7 4 12 4 Q17 4 17 8 Q17 12 12 12 Q8 12 7 16"
      fill="none"
      stroke="#22c55e"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Stem coming down */}
    <path
      d="M7 16 L7 20"
      stroke="#92400e"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Leaf on top */}
    <path
      d="M12 4 Q16 1 18 3"
      stroke="#22c55e"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Small leaf detail */}
    <path
      d="M17 3 L19 2"
      stroke="#22c55e"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Dot above غ */}
    <circle cx="12" cy="2" r="1.5" fill="#22c55e" stroke="none" />
    {/* Small sprout from curve */}
    <path
      d="M12 12 Q14 10 13 12"
      stroke="#22c55e"
      strokeWidth="1"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export default {
  TasksIcon,
  GiftsIcon,
  XPIcon,
  StreakIcon,
  GardenIcon,
  LogoIcon,
};
