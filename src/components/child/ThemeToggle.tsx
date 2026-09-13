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
      className="p-3 rounded-xl transition-all active:scale-95"
      style={{ background: 'var(--ghrs-bg-card)', border: '2px solid var(--ghrs-border-default)' }}
      aria-label="تبديل المظهر"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
