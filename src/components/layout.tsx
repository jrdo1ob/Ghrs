'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme, Theme } from '@/lib/theme/provider'
import GHRSLogo from '@/components/GHRSLogo'
import { TasksIcon, GiftsIcon, XPIcon, StreakIcon, GardenIcon, ChildIcon, BookIcon, CopyIcon, SettingsIcon, CheckIcon, RejectIcon, UserIcon, SparkleIcon, CoinIcon, ClockIcon } from '@/components/icons'

/* ===== Parent Bottom Navigation (Mobile) ===== */
export function ParentBottomNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/dashboard', label: 'الرئيسية', icon: <GardenIcon size={22} /> },
    { href: '/children', label: 'الأبناء', icon: <ChildIcon size={22} /> },
    { href: '/tasks', label: 'المهام', icon: <TasksIcon size={22} /> },
    { href: '/rewards', label: 'المكافآت', icon: <GiftsIcon size={22} /> },
    { href: '/settings', label: 'المزيد', icon: <SettingsIcon size={22} /> },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ background: 'var(--ghrs-bg-card)', borderTop: '1px solid var(--ghrs-border-default)', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }} aria-label="التنقل السفلي للوالد">
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
    { href: '/dashboard', label: 'الرئيسية', icon: <GardenIcon size={20} /> },
    { href: '/children', label: 'الأبناء', icon: <ChildIcon size={20} /> },
    { href: '/tasks', label: 'المهام', icon: <TasksIcon size={20} /> },
    { href: '/rewards', label: 'المكافآت', icon: <GiftsIcon size={20} /> },
    { href: '/ledger', label: 'سجل المعاملات', icon: <CoinIcon size={20} /> },
    { href: '/activity', label: 'سجل النشاط', icon: <ClockIcon size={20} /> },
    { href: '/payments', label: 'الأموال', icon: <XPIcon size={20} /> },
    { href: '/achievements', label: 'الإنجازات', icon: <StreakIcon size={20} /> },
    { href: '/quran', label: 'القرآن', icon: <BookIcon size={20} /> },
    { href: '/stories', label: 'القصص', icon: <BookIcon size={20} /> },
    { href: '/reward-bank', label: 'بنك المكافآت', icon: <GiftsIcon size={20} /> },
    { href: '/presets', label: 'بنك المهام', icon: <CopyIcon size={20} /> },
    { href: '/settings', label: 'الإعدادات', icon: <SettingsIcon size={20} /> },
  ]

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'فاتح', icon: <SparkleIcon size={16} /> },
    { value: 'dark', label: 'داكن', icon: <SparkleIcon size={16} /> },
    { value: 'system', label: 'النظام', icon: <SettingsIcon size={16} /> },
  ]

  return (
    <aside className="hidden md:flex fixed right-0 top-0 bottom-0 w-[var(--ghrs-sidebar-width)] z-40 flex-col" style={{ background: 'var(--ghrs-bg-card)', borderLeft: '1px solid var(--ghrs-border-default)' }} aria-label="القائمة الجانبية للوالد">
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--ghrs-border-default)' }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <GHRSLogo size={40} animate={false} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--ghrs-green-700)' }}>غرس</h1>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>ازرع العادة، واحصد الإنجاز</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="روابط التنقل">
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
              aria-label={`切换到${option.label}主题`}
              aria-pressed={theme === option.value}
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
    { href: '/child-mode', label: 'الرئيسية', icon: <GardenIcon size={22} /> },
    { href: '/child-mode/tasks', label: 'مهامي', icon: <TasksIcon size={22} /> },
    { href: '/child-mode/garden', label: 'حديقتي', icon: <GardenIcon size={22} /> },
    { href: '/child-mode/gifts', label: 'هداياي', icon: <GiftsIcon size={22} /> },
    { href: '/child-mode/profile', label: 'ملفي', icon: <UserIcon size={22} /> },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--ghrs-bg-card)', borderTop: '1px solid var(--ghrs-border-default)', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }} aria-label="التنقل السفلي للطفل">
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
  icon: React.ReactNode
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
  const [exiting, setExiting] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const handleClose = () => {
    setExiting(true)
    setTimeout(onClose, 300)
  }

  return (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 transition-all duration-300 ${
        exiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0 ghrs-animate-slide-up'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className={`flex items-center gap-3 p-4 rounded-xl shadow-lg ${
        type === 'success' 
          ? 'bg-ghrs-green-50 border border-ghrs-green-200' 
          : 'bg-ghrs-red-50 border border-ghrs-red-200'
      }`}>
        <span className="text-xl">{type === 'success' ? <CheckIcon size={20} /> : <RejectIcon size={20} />}</span>
        <p className={`flex-1 font-semibold ${type === 'success' ? 'text-ghrs-green-700' : 'text-ghrs-red-700'}`}>
          {message}
        </p>
        <button onClick={handleClose} className="text-lg opacity-50 hover:opacity-100" aria-label="إغلاق">✕</button>
      </div>
    </div>
  )
}
