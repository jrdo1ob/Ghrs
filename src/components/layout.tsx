'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme, Theme } from '@/lib/theme/provider'

/* ===== Parent Bottom Navigation (Mobile) ===== */
export function ParentBottomNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/dashboard', label: 'الرئيسية', icon: '🏠' },
    { href: '/children', label: 'الأبناء', icon: '👶' },
    { href: '/tasks', label: 'المهام', icon: '📋' },
    { href: '/rewards', label: 'المكافآت', icon: '🎁' },
    { href: '/settings', label: 'المزيد', icon: '⋯' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ background: 'var(--ghrs-bg-card)', borderTop: '1px solid var(--ghrs-border-default)', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-around h-[var(--ghrs-nav-height)] px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/dashboard' && pathname === '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-ghrs-green-700 bg-ghrs-green-50'
                  : 'text-ghrs-text-secondary hover:text-ghrs-green-600'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/* ===== Parent Sidebar (Desktop) ===== */
export function ParentSidebar() {
  const pathname = usePathname()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const tabs = [
    { href: '/dashboard', label: 'الرئيسية', icon: '🏠' },
    { href: '/children', label: 'الأبناء', icon: '👶' },
    { href: '/tasks', label: 'المهام', icon: '📋' },
    { href: '/rewards', label: 'المكافآت', icon: '🎁' },
    { href: '/payments', label: 'الأموال', icon: '💰' },
    { href: '/achievements', label: 'الإنجازات', icon: '🏆' },
    { href: '/quran', label: 'القرآن', icon: '📖' },
    { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
  ]

  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'فاتح', icon: '☀️' },
    { value: 'dark', label: 'داكن', icon: '🌙' },
    { value: 'system', label: 'النظام', icon: '💻' },
  ]

  return (
    <aside className="hidden md:flex fixed right-0 top-0 bottom-0 w-[var(--ghrs-sidebar-width)] z-40 flex-col" style={{ background: 'var(--ghrs-bg-card)', borderLeft: '1px solid var(--ghrs-border-default)' }}>
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--ghrs-border-default)' }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-3xl">🌱</span>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--ghrs-green-700)' }}>غرس</h1>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>ازرع العادة، واحصد الإنجاز</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/dashboard' && pathname === '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'text-ghrs-green-700 bg-ghrs-green-50 font-bold'
                  : 'text-ghrs-text-secondary hover:text-ghrs-green-600 hover:bg-ghrs-bg-tertiary'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-semibold">{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Theme Switcher */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--ghrs-border-default)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ghrs-text-tertiary)' }}>المظهر</p>
        <div className="flex gap-1">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                theme === option.value
                  ? 'bg-ghrs-green-100 text-ghrs-green-700'
                  : 'text-ghrs-text-secondary hover:bg-ghrs-bg-tertiary'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

/* ===== Child Bottom Navigation ===== */
export function ChildBottomNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/child-mode', label: 'الرئيسية', icon: '🏠' },
    { href: '/child-mode/tasks', label: 'مهامي', icon: '📋' },
    { href: '/child-mode/garden', label: 'حديقتي', icon: '🌳' },
    { href: '/child-mode/gifts', label: 'هداياي', icon: '🎁' },
    { href: '/child-mode/profile', label: 'ملفي', icon: '👤' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--ghrs-bg-card)', borderTop: '1px solid var(--ghrs-border-default)', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-around h-[var(--ghrs-nav-height)] px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/child-mode' && pathname === '/child-mode')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-ghrs-green-700 bg-ghrs-green-50'
                  : 'text-ghrs-text-secondary hover:text-ghrs-green-600'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/* ===== Page Header Component ===== */
export function PageHeader({ 
  title, 
  subtitle,
  backHref,
  action
}: { 
  title: string
  subtitle?: string
  backHref?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-6">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-green-600)' }}>
          <span>→</span>
          <span>العودة</span>
        </Link>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{title}</h1>
          {subtitle && <p className="mt-1" style={{ color: 'var(--ghrs-text-secondary)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}

/* ===== Empty State Component ===== */
export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ghrs-text-primary)' }}>{title}</h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{description}</p>
      {action}
    </div>
  )
}

/* ===== Skeleton Loader ===== */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`ghrs-skeleton ${className}`} />
}

export function CardSkeleton() {
  return (
    <div className="ghrs-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

/* ===== Success/Error Toast ===== */
export function Toast({ 
  type, 
  message, 
  onClose 
}: { 
  type: 'success' | 'error'
  message: string
  onClose: () => void
}) {
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ghrs-animate-slide-up max-w-md w-full mx-4`}>
      <div className={`flex items-center gap-3 p-4 rounded-xl shadow-lg ${
        type === 'success' 
          ? 'bg-ghrs-green-50 border border-ghrs-green-200' 
          : 'bg-ghrs-red-50 border border-ghrs-red-200'
      }`}>
        <span className="text-xl">{type === 'success' ? '✅' : '❌'}</span>
        <p className={`flex-1 font-semibold ${type === 'success' ? 'text-ghrs-green-700' : 'text-ghrs-red-700'}`}>
          {message}
        </p>
        <button onClick={onClose} className="text-lg opacity-50 hover:opacity-100">✕</button>
      </div>
    </div>
  )
}
