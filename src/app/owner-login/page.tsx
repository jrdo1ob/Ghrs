'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function OwnerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('حدث خطأ أثناء تسجيل الدخول بحساب Google')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-4xl">🌱</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--ghrs-green-700)' }}>غرس</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6" style={{ color: 'var(--ghrs-text-primary)' }}>
            دخول ولي الأمر
          </h1>
          <p className="mt-2" style={{ color: 'var(--ghrs-text-secondary)' }}>
            سجّل دخولك لإدارة عائلتك
          </p>
        </div>

        {/* Login Form */}
        <div className="ghrs-card p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="ghrs-input"
                placeholder="email@example.com"
                dir="ltr"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="ghrs-input"
                placeholder="••••••••"
                dir="ltr"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full ghrs-btn-primary disabled:opacity-50"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--ghrs-border-default)' }} />
            <span className="text-sm" style={{ color: 'var(--ghrs-text-tertiary)' }}>أو</span>
            <div className="flex-1 h-px" style={{ background: 'var(--ghrs-border-default)' }} />
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl font-bold transition-colors"
            style={{ 
              background: 'var(--ghrs-bg-tertiary)', 
              color: 'var(--ghrs-text-primary)',
              border: '1px solid var(--ghrs-border-default)'
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>دخول بحساب Google</span>
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-3">
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>
            ليس لديك حساب؟{' '}
            <Link href="/owner-signup" className="font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
              أنشئ حساباً جديداً
            </Link>
          </p>
          <p>
            <Link href="/family-login" className="text-sm" style={{ color: 'var(--ghrs-text-tertiary)' }}>
              دخول أفراد العائلة
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
