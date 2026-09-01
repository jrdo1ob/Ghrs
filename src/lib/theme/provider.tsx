'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return { theme: 'system' as Theme, setTheme: () => {}, resolvedTheme: 'light' as 'light' | 'dark' }
  }
  return context
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('ghrs-theme') as Theme | null
    if (saved) {
      setThemeState(saved)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const resolveTheme = () => {
      let resolved: 'light' | 'dark'
      if (theme === 'system') {
        resolved = mediaQuery.matches ? 'dark' : 'light'
      } else {
        resolved = theme
      }
      setResolvedTheme(resolved)
      document.documentElement.setAttribute('data-theme', resolved)
    }

    resolveTheme()

    const handleChange = () => {
      if (theme === 'system') {
        resolveTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('ghrs-theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
