'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function FamilySetupPage() {
  const [familyName, setFamilyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/owner-login')
        return
      }

      // Check if user already has a family
      const { data: identity } = await supabase
        .from('auth_identities')
        .select('member_id')
        .eq('auth_user_id', user.id)
        .single()

      if (identity) {
        router.push('/dashboard')
        return
      }

      setChecking(false)
    }

    checkExisting()
  }, [])

  const generateFamilyCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/owner-login')
      return
    }

    // Create family
    const familyCode = generateFamilyCode()
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: familyName,
        code: familyCode,
        created_by: user.id,
      })
      .select()
      .single()

    if (familyError) {
      setError(familyError.message)
      setLoading(false)
      return
    }

    // Create owner member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        family_id: family.id,
        name: ownerName,
        role: 'owner',
      })
      .select()
      .single()

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    // Link auth identity
    const { error: linkError } = await supabase
      .from('auth_identities')
      .insert({
        member_id: member.id,
        auth_user_id: user.id,
        provider: 'email',
      })

    if (linkError) {
      setError(linkError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🌱</div>
          <p style={{ color: 'var(--ghrs-text-secondary)' }}>جاري التحميل...</p>
        </div>
      </main>
    )
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
            إعداد العائلة
          </h1>
          <p className="mt-2" style={{ color: 'var(--ghrs-text-secondary)' }}>
            أنشئ عائلتك وابدأ رحلة النمو
          </p>
        </div>

        {/* Setup Form */}
        <div className="ghrs-card p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم العائلة</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="ghrs-input"
                placeholder="عائلة غرس"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسمك (ولي الأمر)</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                className="ghrs-input"
                placeholder="أحمد"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full ghrs-btn-primary disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء العائلة'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p style={{ color: 'var(--ghrs-text-tertiary)' }}>
            سيتم إنشاء كود فريد لعائلتك يمكنك مشاركته مع الأفراد
          </p>
        </div>
      </div>
    </main>
  )
}
