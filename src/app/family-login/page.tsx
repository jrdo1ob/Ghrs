'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setMemberSession } from '@/lib/auth/session'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function FamilyLoginContent() {
  const searchParams = useSearchParams()
  const [loginCode, setLoginCode] = useState(searchParams.get('code') || '')
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

    // First, look up the member by login_code
    const { data: memberLookup, error: lookupError } = await supabase
      .from('members')
      .select('id, family_id, role, name')
      .eq('login_code', loginCode.toUpperCase())
      .single()

    if (lookupError || !memberLookup) {
      setError('الكود غير صحيح')
      setLoading(false)
      return
    }

    // Then verify the PIN
    const { data: pinValid, error: pinError } = await supabase
      .rpc('verify_member_pin', {
        p_member_id: memberLookup.id,
        p_pin: pin,
      })

    if (pinError || !pinValid) {
      setError('الرمز غير صحيح')
      setLoading(false)
      return
    }

    const memberData = {
      member_id: memberLookup.id,
      family_id: memberLookup.family_id,
      member_role: memberLookup.role,
      member_name: memberLookup.name,
    }

    if (memberData.member_role === 'child') {
      // Child login
      localStorage.setItem('child_id', memberData.member_id)
      localStorage.setItem('family_id', memberData.family_id)
      setMemberSession(memberData.member_id, 'child')
      router.push('/child-mode')
    } else if (memberData.member_role === 'parent' || memberData.member_role === 'owner') {
      // Parent/Owner login via code + PIN
      localStorage.setItem('parent_id', memberData.member_id)
      localStorage.setItem('family_id', memberData.family_id)
      setMemberSession(memberData.member_id, memberData.member_role)
      router.push('/dashboard')
    } else {
      router.push('/dashboard')
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
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                className="ghrs-input text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="••••"
                maxLength={6}
                dir="ltr"
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
