// Centralized Gamification Constants & Helpers
// Used across child-mode pages, profile, garden, dashboard

export interface Level {
  level: number
  name: string
  emoji: string
  minXp: number
  maxXp: number
  soilColor: string
  plantSize: string
  description?: string
}

export const LEVELS: Level[] = [
  { level: 1, name: 'البذرة', emoji: '🌰', minXp: 0, maxXp: 50, soilColor: '#8B4513', plantSize: 'text-2xl', description: ' بدأت الرحلة! أنت بذرة صغيرة تنتظر أن تنمو.' },
  { level: 2, name: 'البرعم', emoji: '🌱', minXp: 50, maxXp: 200, soilColor: '#A0522D', plantSize: 'text-3xl', description: 'بدأت تنمو! أنت برعم صغير يستمد من الشمس.' },
  { level: 3, name: 'النبتة', emoji: '🌿', minXp: 200, maxXp: 500, soilColor: '#6B8E23', plantSize: 'text-4xl', description: 'أنت نبتة قوية! أوراقك تزداد يوماً بعد يوم.' },
  { level: 4, name: 'الشجرة الصغيرة', emoji: '🌳', minXp: 500, maxXp: 1000, soilColor: '#228B22', plantSize: 'text-5xl', description: 'أنت شجرة صغيرة! فروعك تنمو كل يوم.' },
  { level: 5, name: 'الشجرة الكبيرة', emoji: '🌲', minXp: 1000, maxXp: 2000, soilColor: '#006400', plantSize: 'text-6xl', description: 'أنت شجرة ضخمة! تقدم الظل للجميع.' },
  { level: 6, name: 'الحديقة', emoji: '🏡', minXp: 2000, maxXp: 999999, soilColor: '#32CD32', plantSize: 'text-7xl', description: 'لقد وصلت! حديقتك مزهرة وجميلة.' },
]

export function getLevel(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i]
  }
  return LEVELS[0]
}

export function getNextLevel(current: Level): Level | null {
  const idx = LEVELS.findIndex(l => l.level === current.level)
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null
}

export function getXpProgress(xp: number): { current: Level; next: Level | null; percent: number } {
  const current = getLevel(xp)
  const next = getNextLevel(current)
  const percent = next
    ? Math.min(100, ((xp - current.minXp) / (next.minXp - current.minXp)) * 100)
    : 100
  return { current, next, percent }
}

// XP ranges per level for reference
export const XP_TABLE = LEVELS.map(l => ({
  level: l.level,
  name: l.name,
  minXp: l.minXp,
  maxXp: l.maxXp === 999999 ? '∞' : l.maxXp,
}))
