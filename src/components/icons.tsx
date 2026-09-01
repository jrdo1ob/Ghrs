import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

const defaultProps = (size: number, className: string, color: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: `inline-block flex-shrink-0 ${className}`,
});

// 1. TasksIcon - Notepad with green sprout
export const TasksIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <rect x="4" y="4" width="16" height="18" rx="2" />
    <line x1="8" y1="10" x2="16" y2="10" opacity="0.4" />
    <line x1="8" y1="13" x2="16" y2="13" opacity="0.4" />
    <line x1="8" y1="16" x2="14" y2="16" opacity="0.4" />
    <path d="M12 4 V1" stroke="#22c55e" strokeWidth="2" />
    <path d="M12 1 Q14 2 13 4" fill="#22c55e" stroke="none" />
    <path d="M12 2 Q10 3 11 4" fill="#22c55e" stroke="none" />
  </svg>
);

// 2. GiftsIcon - Gift box with sparkles
export const GiftsIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <rect x="3" y="10" width="18" height="11" rx="1.5" />
    <line x1="12" y1="10" x2="12" y2="21" stroke="#f59e0b" strokeWidth="2" />
    <rect x="2" y="6" width="20" height="4" rx="1" />
    <path d="M12 6 Q9 4 9 2.5" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
    <path d="M12 6 Q15 4 15 2.5" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
    <circle cx="5" cy="4" r="0.8" fill="#f59e0b" stroke="none" />
    <circle cx="19" cy="3" r="0.8" fill="#f59e0b" stroke="none" />
    <circle cx="17" cy="1.5" r="0.5" fill="#22c55e" stroke="none" />
    <path d="M20 6 L20.5 5 M20 4 L20.5 3" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// 3. XPIcon - Star with green base
export const XPIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="12" r="10" fill="#f59e0b" opacity="0.1" stroke="none" />
    <path
      d="M12 2 L14.5 9 L22 9.5 L16.5 14 L18 22 L12 18 L6 22 L7.5 14 L2 9.5 L9.5 9 Z"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12 6 L13.5 10 L17.5 10.5 L14.5 13 L15 17 L12 15 L9 17 L9.5 13 L6.5 10.5 L10.5 10 Z"
      fill="#f59e0b"
      opacity="0.3"
      stroke="none"
    />
    <path d="M10 22 Q12 24 14 22" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="12" cy="22" r="1" fill="#22c55e" stroke="none" />
  </svg>
);

// 4. StreakIcon - Flame with sparkles
export const StreakIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path
      d="M12 2 C12 2 6 8 6 14 C6 18 8.5 21 12 21 C15.5 21 18 18 18 14 C18 8 12 2 12 2Z"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="2"
    />
    <path
      d="M12 8 C12 8 9 12 9 15 C9 17 10 18.5 12 18.5 C14 18.5 15 17 15 15 C15 12 12 8 12 8Z"
      fill="#f59e0b"
      opacity="0.4"
      stroke="none"
    />
    <circle cx="8" cy="6" r="0.6" fill="#22c55e" stroke="none" />
    <circle cx="16" cy="5" r="0.6" fill="#22c55e" stroke="none" />
    <path d="M4 10 L3 9.5 M4 8 L3 8" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
    <path d="M20 10 L21 9.5 M20 8 L21 8" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// 5. GardenIcon - Family tree with leaves
export const GardenIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M12 22 L12 12" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="12" cy="8" rx="5" ry="4" fill="none" stroke="#22c55e" strokeWidth="2" />
    <path d="M12 15 Q6 13 5 9" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="5" cy="8" r="2.5" fill="none" stroke="#22c55e" strokeWidth="1.5" />
    <path d="M12 15 Q18 13 19 9" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="19" cy="8" r="2.5" fill="none" stroke="#22c55e" strokeWidth="1.5" />
    <path d="M10 6 Q9 4 11 5" fill="#22c55e" stroke="none" />
    <path d="M14 6 Q15 4 13 5" fill="#22c55e" stroke="none" />
    <path d="M12 5 Q12 3 12 5" fill="#22c55e" stroke="none" />
    <path d="M8 22 Q12 20 16 22" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

// 6. LogoIcon - Arabic letter غ as sprout
export const LogoIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path
      d="M7 8 Q7 4 12 4 Q17 4 17 8 Q17 12 12 12 Q8 12 7 16"
      fill="none"
      stroke="#22c55e"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path d="M7 16 L7 20" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 4 Q16 1 18 3" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M17 3 L19 2" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <circle cx="12" cy="2" r="1.5" fill="#22c55e" stroke="none" />
    <path d="M12 12 Q14 10 13 12" stroke="#22c55e" strokeWidth="1" fill="none" strokeLinecap="round" />
  </svg>
);

// 7. ChildIcon - Friendly child face
export const ChildIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="10" r="6" />
    <circle cx="10" cy="9" r="1" fill={color} stroke="none" />
    <circle cx="14" cy="9" r="1" fill={color} stroke="none" />
    <path d="M10 12 Q12 14 14 12" strokeWidth="1.5" />
    <path d="M6 6 Q8 4 10 6" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 6 Q16 4 18 6" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="11" r="1.5" fill="#f59e0b" opacity="0.3" stroke="none" />
    <circle cx="16" cy="11" r="1.5" fill="#f59e0b" opacity="0.3" stroke="none" />
    <path d="M8 20 Q12 18 16 20" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 8. LockIcon - Lock/padlock
export const LockIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11 V7 C8 4.8 9.8 3 12 3 C14.2 3 16 4.8 16 7 V11" />
    <circle cx="12" cy="16" r="1.5" fill={color} stroke="none" />
    <line x1="12" y1="17.5" x2="12" y2="19" strokeWidth="1.5" />
  </svg>
);

// 9. CheckIcon - Checkmark
export const CheckIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M5 12 L10 17 L19 7" />
  </svg>
);

// 10. ClockIcon - Clock/pending
export const ClockIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7 V12 L15 15" />
  </svg>
);

// 11. PauseIcon - Pause bars
export const PauseIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

// 12. PlayIcon - Play triangle
export const PlayIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M6 4 L20 12 L6 20 Z" fill={color} stroke="none" />
  </svg>
);

// 13. EditIcon - Pencil/edit
export const EditIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M16 3 L21 8 L8 21 L3 21 L3 16 Z" />
    <path d="M13 6 L18 11" />
  </svg>
);

// 14. DeleteIcon - Trash can
export const DeleteIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M3 6 H21" />
    <path d="M8 6 V4 C8 3 9 2 10 2 H14 C15 2 16 3 16 4 V6" />
    <path d="M5 6 L6 20 C6 21 7 22 8 22 H16 C17 22 18 21 18 20 L19 6" />
    <line x1="10" y1="10" x2="10" y2="18" />
    <line x1="14" y1="10" x2="14" y2="18" />
  </svg>
);

// 15. BookIcon - Open book
export const BookIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M2 4 C2 4 5 3 12 5 C19 3 22 4 22 4 V20 C22 20 19 19 12 21 C5 19 2 20 2 20 Z" />
    <line x1="12" y1="5" x2="12" y2="21" />
    <line x1="6" y1="9" x2="10" y2="9.5" strokeWidth="1.5" />
    <line x1="6" y1="12" x2="10" y2="12.5" strokeWidth="1.5" />
    <line x1="6" y1="15" x2="10" y2="15.5" strokeWidth="1.5" />
  </svg>
);

// 16. StarIcon - Star
export const StarIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path
      d="M12 2 L14.5 9 L22 9.5 L16.5 14 L18 22 L12 18 L6 22 L7.5 14 L2 9.5 L9.5 9 Z"
      fill="#f59e0b"
      stroke="#f59e0b"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// 17. CoinIcon - Coin/money
export const CoinIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="6" opacity="0.3" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f59e0b" stroke="none">
      $
    </text>
  </svg>
);

// 18. TrophyIcon - Trophy cup
export const TrophyIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M6 4 H18 V12 C18 16 15 19 12 19 C9 19 6 16 6 12 Z" />
    <path d="M6 7 Q2 7 2 11 Q2 14 6 14" />
    <path d="M18 7 Q22 7 22 11 Q22 14 18 14" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <path d="M8 22 H16" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 4 V2 H14 V4" strokeWidth="1.5" />
  </svg>
);

// 19. ShieldIcon - Shield
export const ShieldIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M12 2 L3 6 V12 C3 17 7 21 12 22 C17 21 21 17 21 12 V6 Z" />
    <path d="M9 12 L11 14 L15 10" strokeWidth="2" />
  </svg>
);

// 20. PartyIcon - Party popper
export const PartyIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M4 20 L2 22 L4 20 C2 18 2 14 4 12 L18 2 C20 1 22 2 22 4 L12 18 C10 20 6 22 4 20 Z" />
    <circle cx="7" cy="7" r="1" fill="#f59e0b" stroke="none" />
    <circle cx="10" cy="4" r="0.8" fill="#22c55e" stroke="none" />
    <circle cx="5" cy="11" r="0.8" fill="#f59e0b" stroke="none" />
    <path d="M14 5 L15 3" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 8 L19 7" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 21. UserIcon - User silhouette
export const UserIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 22 C4 17 8 14 12 14 C16 14 20 17 20 22" />
  </svg>
);

// 22. CopyIcon - Copy/clipboard
export const CopyIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <rect x="8" y="8" width="12" height="14" rx="2" />
    <path d="M16 8 V4 C16 3 15 2 14 2 H6 C5 2 4 3 4 4 V16 C4 17 5 18 6 18 H8" />
  </svg>
);

// 23. MenuIcon - Three dots
export const MenuIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="5" r="1.5" fill={color} stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="12" cy="19" r="1.5" fill={color} stroke="none" />
  </svg>
);

// 24. CrownIcon - Crown
export const CrownIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M2 18 L4 7 L8 12 L12 4 L16 12 L20 7 L22 18 Z" />
    <rect x="2" y="18" width="20" height="3" rx="1" />
    <circle cx="4" cy="7" r="1" fill="#f59e0b" stroke="none" />
    <circle cx="12" cy="4" r="1" fill="#f59e0b" stroke="none" />
    <circle cx="20" cy="7" r="1" fill="#f59e0b" stroke="none" />
  </svg>
);

// 25. MotherIcon - Mother figure
export const MotherIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="7" r="4" />
    <path d="M4 22 C4 16 8 13 12 13 C16 13 20 16 20 22" />
    <path d="M8 7 Q6 5 7 3" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 7 Q18 5 17 3" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10" cy="6" r="0.8" fill={color} stroke="none" />
    <circle cx="14" cy="6" r="0.8" fill={color} stroke="none" />
    <path d="M10.5 8.5 Q12 10 13.5 8.5" strokeWidth="1" />
  </svg>
);

// 26. PlusIcon - Plus sign
export const PlusIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// 27. LeafIcon - Leaf
export const LeafIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M4 20 Q4 10 14 4 Q20 2 22 4 Q20 8 16 14 Q10 20 4 20 Z" />
    <path d="M4 20 Q10 14 22 4" strokeWidth="1.5" />
    <path d="M8 16 Q10 13 12 12" strokeWidth="1" opacity="0.5" />
    <path d="M6 18 Q8 15 10 14" strokeWidth="1" opacity="0.5" />
  </svg>
);

// 28. WaterIcon - Water drop
export const WaterIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M12 2 Q12 2 6 12 Q3 17 6 20 Q9 23 12 23 Q15 23 18 20 Q21 17 18 12 Q12 2 12 2 Z" />
    <path d="M9 16 Q10 14 12 14" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
  </svg>
);

// 29. SparkleIcon - Sparkle
export const SparkleIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M12 2 L13 9 L20 10 L13 11 L12 18 L11 11 L4 10 L11 9 Z" fill={color} stroke="none" />
    <path d="M19 15 L19.5 17 L21 17.5 L19.5 18 L19 20 L18.5 18 L17 17.5 L18.5 17 Z" fill={color} stroke="none" />
    <path d="M5 16 L5.3 17.5 L7 17.7 L5.3 18 L5 19.5 L4.7 18 L3 17.7 L4.7 17 Z" fill={color} stroke="none" />
  </svg>
);

// 30. FireIcon - Fire/flame
export const FireIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path
      d="M12 2 C12 2 6 8 6 14 C6 18 8.5 21 12 21 C15.5 21 18 18 18 14 C18 8 12 2 12 2Z"
    />
    <path
      d="M12 8 C12 8 9 12 9 15 C9 17 10 18.5 12 18.5 C14 18.5 15 17 15 15 C15 12 12 8 12 8Z"
      opacity="0.4"
    />
  </svg>
);

// 31. HeartIcon - Heart
export const HeartIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path
      d="M12 21 C12 21 3 14 3 8 C3 5 5 3 8 3 C10 3 11.5 4 12 5 C12.5 4 14 3 16 3 C19 3 21 5 21 8 C21 14 12 21 12 21 Z"
      fill="#ef4444"
      stroke="#ef4444"
    />
  </svg>
);

// 32. SchoolIcon - School building
export const SchoolIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M3 22 V10 L12 4 L21 10 V22" />
    <rect x="8" y="14" width="3" height="3" rx="0.5" />
    <rect x="13" y="14" width="3" height="3" rx="0.5" />
    <rect x="10" y="18" width="4" height="4" rx="0.5" />
    <line x1="12" y1="4" x2="12" y2="2" strokeWidth="2" />
    <circle cx="12" cy="2" r="1" fill={color} stroke="none" />
    <line x1="3" y1="22" x2="21" y2="22" strokeWidth="2" />
  </svg>
);

// 33. QuranIcon - Quran/book
export const QuranIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M2 4 C2 4 5 3 12 5 C19 3 22 4 22 4 V20 C22 20 19 19 12 21 C5 19 2 20 2 20 Z" />
    <line x1="12" y1="5" x2="12" y2="21" />
    <path d="M8 8 Q10 7 12 8 Q10 9 8 8 Z" fill={color} stroke="none" opacity="0.5" />
    <path d="M16 8 Q14 7 12 8 Q14 9 16 8 Z" fill={color} stroke="none" opacity="0.5" />
    <circle cx="8" cy="12" r="0.8" fill="#22c55e" stroke="none" />
    <circle cx="16" cy="12" r="0.8" fill="#22c55e" stroke="none" />
  </svg>
);

// 34. SettingsIcon - Gear
export const SettingsIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1 V4 M12 20 V23 M4.22 4.22 L6.34 6.34 M17.66 17.66 L19.78 19.78 M1 12 H4 M20 12 H23 M4.22 19.78 L6.34 17.66 M17.66 6.34 L19.78 4.22" />
  </svg>
);

// 35. HomeIcon - House
export const HomeIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M3 12 L12 3 L21 12" />
    <path d="M5 10 V20 C5 21 6 22 7 22 H10 V15 H14 V22 H17 C18 22 19 21 19 20 V10" />
  </svg>
);

// 36. RejectIcon - X mark
export const RejectIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

// 37. FamilyIcon - Family group
export const FamilyIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="8" cy="7" r="3" />
    <path d="M2 22 C2 17 5 14 8 14 C9 14 10 14.5 11 15" />
    <circle cx="16" cy="7" r="3" />
    <path d="M22 22 C22 17 19 14 16 14 C15 14 14 14.5 13 15" />
    <circle cx="12" cy="18" r="2" />
    <path d="M8 22 C8 20 10 19 12 19 C14 19 16 20 16 22" />
  </svg>
);

// 38. WarningIcon - Warning triangle
export const WarningIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <path d="M12 2 L22 20 H2 Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
    <line x1="12" y1="9" x2="12" y2="14" stroke="white" strokeWidth="2" />
    <circle cx="12" cy="17" r="1" fill="white" stroke="none" />
  </svg>
);

// 39. InfoIcon - Info circle
export const InfoIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <circle cx="12" cy="8" r="1" fill={color} stroke="none" />
  </svg>
);

// 40. EmptyIcon - Empty state icon
export const EmptyIcon: React.FC<IconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg {...defaultProps(size, className, color)}>
    <rect x="3" y="3" width="18" height="18" rx="3" opacity="0.3" />
    <path d="M8 12 Q12 8 16 12 Q12 16 8 12 Z" opacity="0.5" />
    <circle cx="12" cy="12" r="2" opacity="0.3" />
    <path d="M7 7 L9 9 M17 7 L15 9 M7 17 L9 15 M17 17 L15 15" strokeWidth="1" opacity="0.3" />
  </svg>
);

export default {
  TasksIcon,
  GiftsIcon,
  XPIcon,
  StreakIcon,
  GardenIcon,
  LogoIcon,
  ChildIcon,
  LockIcon,
  CheckIcon,
  ClockIcon,
  PauseIcon,
  PlayIcon,
  EditIcon,
  DeleteIcon,
  BookIcon,
  StarIcon,
  CoinIcon,
  TrophyIcon,
  ShieldIcon,
  PartyIcon,
  UserIcon,
  CopyIcon,
  MenuIcon,
  CrownIcon,
  MotherIcon,
  PlusIcon,
  LeafIcon,
  WaterIcon,
  SparkleIcon,
  FireIcon,
  HeartIcon,
  SchoolIcon,
  QuranIcon,
  SettingsIcon,
  HomeIcon,
  RejectIcon,
  FamilyIcon,
  WarningIcon,
  InfoIcon,
  EmptyIcon,
};
