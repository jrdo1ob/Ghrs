'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function FamilyLoginContent() {
  const searchParams = useSearchParams()
  const [loginCode, setLoginCode] = useState(() => {
    // Pre-fill from URL param or localStorage
    const urlCode = searchParams.get('code')
    if (urlCode) return urlCode
    if (typeof window !== 'undefined') {
      return localStorage.getItem('family_code') || ''
    }
    return ''
  })
  const [pin, setPin] = useState('')
  const [memberName, setMemberName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDirectLink, setIsDirectLink] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setIsDirectLink(true)
      setLoginCode(code)

      const getMemberName = async () => {
        const { data } = await supabase
          .from('members')
          .select('name')
          .eq('login_code', code.toUpperCase())
          .single()
        if (data) setMemberName(data.name)
      }
      getMemberName()
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Call secure server-side login API
      const response = await fetch('/api/auth/member-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginCode: loginCode.toUpperCase(), pin }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'الكود أو الرمز غير صحيح')
        setLoading(false)
        return
      }

      // Store only role and name in localStorage (for UI purposes only)
      // member_id and family_id are NO LONGER stored in localStorage
      localStorage.setItem('ghrs_session_role', result.role)
      localStorage.setItem('family_code', loginCode.toUpperCase())
      if (result.name) {
        localStorage.setItem('member_name', result.name)
      }

      // Redirect based on role
      if (result.role === 'child') {
        router.push('/child-mode')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('[GHRS LOGIN] Error:', err)
      setError('حدث خطأ أثناء تسجيل الدخول')
      setLoading(false)
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
            {isDirectLink ? `مرحباً ${memberName} 🌱` : 'دخول أفراد العائلة'}
          </h1>
          <p className="mt-2" style={{ color: 'var(--ghrs-text-secondary)' }}>
            {isDirectLink ? 'أدخل رمز PIN للدخول' : 'أدخل كودك الشخصي ورمز PIN'}
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
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>كود الدخول</label>
              <input
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                required
                className="ghrs-input text-center text-xl tracking-widest font-mono"
                placeholder="KXNZX2-101"
                autoFocus
              />
              {!isDirectLink && (
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                  مثال: KXNZX2-101 للطفل، KXNZX2-001 للأب/الأم
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>رمز PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                className="ghrs-input text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="••••"
                maxLength={6}
                dir="ltr"
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full disabled:opacity-50 py-3 px-6 rounded-xl font-bold text-white transition-colors"
              style={{ background: 'var(--ghrs-amber-500)' }}
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        {!isDirectLink && (
          <div className="mt-6 text-center space-y-2">
            <p>
              <Link href="/owner-login" className="font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                دخول المالك بالبريد الإلكتروني
              </Link>
            </p>
            <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
             ᵈ든 للأب، الأم، والطفل. استخدم كود العائلة + رمز PIN
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function FamilyLoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🌱</div>
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
        </div>
      </main>
    }>
      <FamilyLoginContent />
    </Suspense>
  )
}
