'use client'

import React, { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  const toggle = () => {
    const newTheme = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('ghrs-theme', newTheme)
    setIsDark(!isDark)
  }

  return (
    <button
      onClick={toggle}
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
      style={{
        background: 'var(--ghrs-bg-card)',
        border: '1.5px solid var(--ghrs-border-default)',
        boxShadow: 'var(--ghrs-shadow-sm)',
        color: 'var(--ghrs-text-secondary)',
      }}
      aria-label="تبديل المظهر"
    >
      <span className="text-base leading-none">{isDark ? '☀️' : '🌙'}</span>
    </button>
  )
}
