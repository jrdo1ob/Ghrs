'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TasksIcon, GiftsIcon, XPIcon, StreakIcon, GardenIcon, 
  BookIcon, StarIcon, CoinIcon, TrophyIcon, ShieldIcon,
  HeartIcon, SparkleIcon, FireIcon, WaterIcon, LeafIcon,
  ChildIcon, UserIcon, SettingsIcon, SchoolIcon, QuranIcon,
  CopyIcon, CheckIcon, ClockIcon, EditIcon, DeleteIcon,
  PauseIcon, PlayIcon, LockIcon, FamilyIcon, MotherIcon,
  CrownIcon, HomeIcon, MenuIcon, PlusIcon, RejectIcon,
  WarningIcon, InfoIcon, EmptyIcon
} from '@/components/icons'

interface IconOption {
  name: string
  component: React.FC<any>
  category: string
  label: string
}

const ICON_CATEGORIES = [
  { id: 'worship', label: 'عبادات', emoji: '🕌' },
  { id: 'cleanliness', label: 'نظافة', emoji: '🧼' },
  { id: 'study', label: 'دراسة', emoji: '📚' },
  { id: 'sports', label: 'رياضة', emoji: '⚽' },
  { id: 'chores', label: 'ترتيب', emoji: '🧹' },
  { id: 'rewards', label: 'مكافآت', emoji: '🎁' },
  { id: 'general', label: 'عام', emoji: '⭐' },
]

const ALL_ICONS: IconOption[] = [
  // Worship
  { name: 'quran', component: QuranIcon, category: 'worship', label: 'القرآن' },
  { name: 'sparkle', component: SparkleIcon, category: 'worship', label: 'دعاء' },
  { name: 'heart', component: HeartIcon, category: 'worship', label: 'صلاة' },
  { name: 'school', component: SchoolIcon, category: 'worship', label: 'مسجد' },
  
  // Cleanliness
  { name: 'water', component: WaterIcon, category: 'cleanliness', label: 'وضوء' },
  { name: 'leaf', component: LeafIcon, category: 'cleanliness', label: 'نظافة' },
  { name: 'shield', component: ShieldIcon, category: 'cleanliness', label: 'صحة' },
  { name: 'check', component: CheckIcon, category: 'cleanliness', label: 'إنجاز' },
  
  // Study
  { name: 'book', component: BookIcon, category: 'study', label: 'قراءة' },
  { name: 'tasks', component: TasksIcon, category: 'study', label: 'واجبات' },
  { name: 'copy', component: CopyIcon, category: 'study', label: 'نسخ' },
  { name: 'star', component: StarIcon, category: 'study', label: 'تفوق' },
  
  // Sports
  { name: 'fire', component: FireIcon, category: 'sports', label: 'نشاط' },
  { name: 'streak', component: StreakIcon, category: 'sports', label: 'رياضة' },
  { name: 'trophy', component: TrophyIcon, category: 'sports', label: 'فوز' },
  { name: 'garden', component: GardenIcon, category: 'sports', label: 'خارج' },
  
  // Chores
  { name: 'home', component: HomeIcon, category: 'chores', label: 'بيت' },
  { name: 'garden-icon', component: GardenIcon, category: 'chores', label: 'حديقة' },
  { name: 'child', component: ChildIcon, category: 'chores', label: 'طفل' },
  { name: 'family', component: FamilyIcon, category: 'chores', label: 'عائلة' },
  
  // Rewards
  { name: 'gifts', component: GiftsIcon, category: 'rewards', label: 'هدية' },
  { name: 'coin', component: CoinIcon, category: 'rewards', label: 'مال' },
  { name: 'xp', component: XPIcon, category: 'rewards', label: 'نقاط' },
  { name: 'crown', component: CrownIcon, category: 'rewards', label: 'تاج' },
  
  // General
  { name: 'settings', component: SettingsIcon, category: 'general', label: 'إعدادات' },
  { name: 'clock', component: ClockIcon, category: 'general', label: 'وقت' },
  { name: 'lock', component: LockIcon, category: 'general', label: 'قفل' },
  { name: 'user', component: UserIcon, category: 'general', label: 'مستخدم' },
]

interface IconPickerProps {
  selectedIcon: string
  onSelect: (iconName: string) => void
  onClose: () => void
}

export default function IconPicker({ selectedIcon, onSelect, onClose }: IconPickerProps) {
  const [activeCategory, setActiveCategory] = useState('all')
  
  const filteredIcons = activeCategory === 'all' 
    ? ALL_ICONS 
    : ALL_ICONS.filter(icon => icon.category === activeCategory)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="ghrs-card p-6 w-full max-w-md ghrs-animate-scale-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>اختر أيقونة</h2>
        
        {/* Category Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          <button onClick={() => setActiveCategory('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
            style={{ background: activeCategory === 'all' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: activeCategory === 'all' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
            الكل
          </button>
          {ICON_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              style={{ background: activeCategory === cat.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: activeCategory === cat.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Icons Grid */}
        <div className="grid grid-cols-6 gap-2 mb-4 max-h-60 overflow-y-auto">
          {filteredIcons.map(icon => {
            const IconComp = icon.component
            const isSelected = selectedIcon === icon.name
            return (
              <button key={icon.name} onClick={() => { onSelect(icon.name); onClose() }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                style={{ background: isSelected ? 'var(--ghrs-green-100)' : 'transparent', border: `2px solid ${isSelected ? 'var(--ghrs-green-500)' : 'transparent'}` }}>
                <IconComp size={20} color={isSelected ? 'var(--ghrs-green-600)' : 'var(--ghrs-text-secondary)'} />
                <span className="text-[10px] font-semibold" style={{ color: isSelected ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-tertiary)' }}>{icon.label}</span>
              </button>
            )
          })}
        </div>

        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>إغلاق</button>
      </div>
    </div>
  )
}

// Helper to get icon component by name
export function getIconByName(name: string): React.FC<any> {
  const icon = ALL_ICONS.find(i => i.name === name)
  return icon?.component || StarIcon
}
