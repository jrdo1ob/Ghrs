'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, Toast } from '@/components/layout'
import { useTheme } from '@/lib/theme/provider'
import { getCurrentUser, clearAuth, AuthUser } from '@/lib/auth/helper'

export default function SettingsPage() {
  const [member, setMember] = useState<any>(null)
  const [family, setFamily] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editingMemberName, setEditingMemberName] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [currencySaving, setCurrencySaving] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/owner-login')
        return
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.memberId)
        .single()

      if (!memberData) {
        router.push('/family-setup')
        return
      }

      setMember(memberData)

      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('id', user.familyId)
        .single()

      setFamily(familyData)
      setLoading(false)
    }

    getData()
  }, [])

  const handleUpdateName = async () => {
    setError('')
    if (!newName.trim()) {
      setError('الاسم لا يمكن أن يكون فارغاً')
      return
    }

    const { error } = await supabase
      .from('families')
      .update({ name: newName })
      .eq('id', family.id)

    if (error) {
      setError(error.message)
      return
    }

    setFamily({ ...family, name: newName })
    setEditing(false)
    setToast({ type: 'success', message: 'تم تعديل اسم العائلة!' })
  }

  const handleUpdateMemberName = async () => {
    setError('')
    if (!newMemberName.trim()) {
      setError('الاسم لا يمكن أن يكون فارغاً')
      return
    }

    const { error } = await supabase
      .from('members')
      .update({ name: newMemberName })
      .eq('id', member.id)

    if (error) {
      setError(error.message)
      return
    }

    setMember({ ...member, name: newMemberName })
    setEditingMemberName(false)
    setToast({ type: 'success', message: 'تم تعديل اسمك!' })
  }

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!family || currencySaving) return
    setCurrencySaving(true)

    const { error } = await supabase
      .from('families')
      .update({ currency: newCurrency })
      .eq('id', family.id)

    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ أثناء تعديل العملة' })
      setCurrencySaving(false)
      return
    }

    setFamily({ ...family, currency: newCurrency })
    setCurrencySaving(false)
    setToast({ type: 'success', message: 'تم تعديل العملة!' })
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="ghrs-card p-6">
                <div className="space-y-4">
                  <div className="h-4 w-1/3 ghrs-skeleton rounded" />
                  <div className="h-10 w-full ghrs-skeleton rounded" />
                  <div className="h-4 w-1/2 ghrs-skeleton rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      <ParentSidebar />

      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <PageHeader 
            title="الإعدادات"
            subtitle="إعدادات العائلة والحساب"
            backHref="/dashboard"
          />

          <div className="space-y-6">
            {/* Family Info */}
            <div className="ghrs-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>معلومات العائلة</h2>
              
              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم العائلة</p>
                  {editing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="ghrs-input flex-1"
                        placeholder="اسم جديد"
                      />
                      <button onClick={handleUpdateName} className="ghrs-btn-primary">حفظ</button>
                      <button onClick={() => { setEditing(false); setError('') }} className="ghrs-btn-secondary">إلغاء</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg" style={{ color: 'var(--ghrs-text-primary)' }}>{family?.name}</p>
                      <button
                        onClick={() => { setNewName(family?.name); setEditing(true) }}
                        className="text-sm font-semibold"
                        style={{ color: 'var(--ghrs-green-600)' }}
                      >
                        ✏️ تعديل
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>كود العائلة</p>
                  <p className="font-bold font-mono text-xl" style={{ color: 'var(--ghrs-green-600)' }}>{family?.code}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>شارك هذا الكود مع أفراد العائلة للدخول</p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>دورك</p>
                  <p className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                    {member?.role === 'owner' ? 'مالك العائلة' : member?.role === 'parent' ? 'ولي الأمر' : 'طفل'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسمك</p>
                  {editingMemberName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="ghrs-input flex-1"
                        placeholder="اسم جديد"
                      />
                      <button onClick={handleUpdateMemberName} className="ghrs-btn-primary">حفظ</button>
                      <button onClick={() => { setEditingMemberName(false); setError('') }} className="ghrs-btn-secondary">إلغاء</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg" style={{ color: 'var(--ghrs-text-primary)' }}>{member?.name}</p>
                      <button
                        onClick={() => { setNewMemberName(member?.name); setEditingMemberName(true) }}
                        className="text-sm font-semibold"
                        style={{ color: 'var(--ghrs-green-600)' }}
                      >
                        ✏️ تعديل
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Currency Settings */}
            <div className="ghrs-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>العملة</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
                اختر عملة العائلة用于عرض المكافآت المالية
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: 'KWD', name: 'الدينار الكويتي', symbol: 'د.ك' },
                  { code: 'SAR', name: 'الريال السعودي', symbol: 'ر.س' },
                  { code: 'AED', name: 'الدرهم الإماراتي', symbol: 'د.إ' },
                  { code: 'QAR', name: 'الريال القطري', symbol: 'ر.ق' },
                  { code: 'BHD', name: 'الدينار البحريني', symbol: 'د.ب' },
                  { code: 'OMR', name: 'الريال العماني', symbol: 'ر.ع' },
                ].map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => handleCurrencyChange(currency.code)}
                    disabled={currencySaving}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                    style={{
                      background: family?.currency === currency.code ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)',
                      border: `2px solid ${family?.currency === currency.code ? 'var(--ghrs-green-500)' : 'transparent'}`,
                      color: family?.currency === currency.code ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)',
                      opacity: currencySaving ? 0.7 : 1
                    }}
                  >
                    <span className="text-lg font-bold">{currency.symbol}</span>
                    <span className="text-xs font-semibold">{currency.code}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="ghrs-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>المظهر</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light' as const, label: 'فاتح', icon: '☀️' },
                  { value: 'dark' as const, label: 'داكن', icon: '🌙' },
                  { value: 'system' as const, label: 'النظام', icon: '💻' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                    style={{
                      background: theme === option.value ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-tertiary)',
                      border: `2px solid ${theme === option.value ? 'var(--ghrs-green-500)' : 'transparent'}`,
                      color: theme === option.value ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)'
                    }}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span className="text-sm font-bold">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account */}
            <div className="ghrs-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>الحساب</h2>
              <button
                onClick={async () => {
                  clearAuth()
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="w-full py-3 px-6 rounded-xl text-sm font-bold transition-colors"
                style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}
              >
                خروج من الحساب
              </button>
            </div>
          </div>
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
