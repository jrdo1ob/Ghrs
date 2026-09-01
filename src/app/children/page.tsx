'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'

export default function ChildrenPage() {
  const [children, setChildren] = useState<any[]>([])
  const [family, setFamily] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPin, setEditPin] = useState('')
  const [newChildName, setNewChildName] = useState('')
  const [newChildPin, setNewChildPin] = useState('')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/owner-login'); return }

      const { data: identity } = await supabase
        .from('auth_identities').select('member_id').eq('auth_user_id', user.id).single()

      if (!identity) { router.push('/family-setup'); return }

      const { data: memberData } = await supabase
        .from('members').select('family_id').eq('id', identity.member_id).single()

      if (!memberData) return

      const { data: familyData } = await supabase
        .from('families').select('*').eq('id', memberData.family_id).single()

      setFamily(familyData)

      const { data: childrenData } = await supabase
        .from('members').select('*')
        .eq('family_id', memberData.family_id)
        .eq('role', 'child')
        .order('created_at', { ascending: true })

      setChildren(childrenData || [])
      setLoading(false)
    }

    getData()
  }, [])

  const showSuccess = (msg: string) => {
    setToast({ type: 'success', message: msg })
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: identity } = await supabase
      .from('auth_identities').select('member_id').eq('auth_user_id', user.id).single()
    if (!identity) return

    const { data: memberData } = await supabase
      .from('members').select('family_id').eq('id', identity.member_id).single()
    if (!memberData) return

    const { data: familyData } = await supabase
      .from('families').select('code').eq('id', memberData.family_id).single()

    const { count } = await supabase
      .from('members').select('*', { count: 'exact', head: true })
      .eq('family_id', memberData.family_id).eq('role', 'child')

    const loginCode = `${familyData?.code}-${100 + (count || 0) + 1}`

    const { data: child, error: childError } = await supabase
      .from('members')
      .insert({ family_id: memberData.family_id, name: newChildName, role: 'child', login_code: loginCode })
      .select().single()

    if (childError) { setError(childError.message); return }

    const { error: pinError } = await supabase
      .rpc('set_member_pin', { p_member_id: child.id, p_pin: newChildPin })

    if (pinError) { setError(pinError.message); return }

    setChildren([...children, { ...child }])
    setShowAdd(false)
    setNewChildName('')
    setNewChildPin('')
    showSuccess(`تم إضافة ${child.name} بنجاح!`)
  }

  const handleUpdateName = async (childId: string) => {
    setError('')
    if (!editName.trim()) { setError('الاسم لا يمكن أن يكون فارغاً'); return }

    const { error } = await supabase
      .from('members').update({ name: editName }).eq('id', childId)

    if (error) { setError(error.message); return }

    setChildren(children.map(c => c.id === childId ? { ...c, name: editName } : c))
    setEditingId(null)
    showSuccess('تم تعديل الاسم!')
  }

  const handleUpdatePin = async (childId: string) => {
    setError('')
    if (!editPin || editPin.length < 4) { setError('الرمز يجب أن يكون 4 أرقام على الأقل'); return }

    const { error } = await supabase
      .rpc('set_member_pin', { p_member_id: childId, p_pin: editPin })

    if (error) { setError(error.message); return }

    setEditingId(null)
    showSuccess('تم تعديل رمز PIN!')
  }

  const handleDeleteChild = async (childId: string, childName: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${childName}"؟`)) return

    const { error } = await supabase.from('members').delete().eq('id', childId)
    if (error) { setError(error.message); return }

    setChildren(children.filter(c => c.id !== childId))
    showSuccess(`تم حذف ${childName}`)
  }

  const copyLoginCode = async (loginCode: string) => {
    await navigator.clipboard.writeText(loginCode)
    setCopiedId(loginCode)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyLoginLink = async (loginCode: string) => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/family-login?code=${loginCode}`
    await navigator.clipboard.writeText(link)
    setCopiedId(loginCode)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
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
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader 
            title="إدارة الأطفال"
            subtitle="إضافة وتعديل ملفات الأطفال"
            backHref="/dashboard"
            action={
              <button
                onClick={() => { setShowAdd(true); setNewChildName(''); setNewChildPin('') }}
                className="ghrs-btn-primary"
              >
                + إضافة طفل
              </button>
            }
          />

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
              {error}
            </div>
          )}

          {/* Add Child Form */}
          {showAdd && (
            <div className="ghrs-card p-6 mb-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>إضافة طفل جديد</h2>
              <form onSubmit={handleAddChild} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم الطفل</label>
                  <input 
                    type="text" 
                    value={newChildName} 
                    onChange={(e) => setNewChildName(e.target.value)} 
                    required
                    className="ghrs-input" 
                    placeholder="سارة" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>رمز PIN (4-6 أرقام)</label>
                  <input 
                    type="password" 
                    value={newChildPin} 
                    onChange={(e) => setNewChildPin(e.target.value)} 
                    required
                    className="ghrs-input text-center text-xl tracking-widest font-mono" 
                    placeholder="1234" 
                    maxLength={6} 
                    dir="ltr" 
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="ghrs-btn-primary">إضافة</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* Children List */}
          <div className="space-y-4">
            {children.map((child) => (
              <div key={child.id} className="ghrs-card p-5">
                {editingId === child.id ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>تعديل {child.name}</h3>
                    
                    {/* Edit Name */}
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>اسم الطفل</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          className="ghrs-input flex-1" 
                        />
                        <button 
                          onClick={() => handleUpdateName(child.id)}
                          className="ghrs-btn-primary"
                        >
                          حفظ الاسم
                        </button>
                      </div>
                    </div>

                    {/* Edit PIN */}
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>رمز PIN الجديد</label>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          value={editPin} 
                          onChange={(e) => setEditPin(e.target.value)}
                          className="ghrs-input flex-1 text-center tracking-widest font-mono" 
                          placeholder="1234" 
                          maxLength={6} 
                          dir="ltr" 
                        />
                        <button 
                          onClick={() => handleUpdatePin(child.id)}
                          className="ghrs-btn-primary"
                          style={{ background: 'var(--ghrs-amber-500)' }}
                        >
                          حفظ الرمز
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => { setEditingId(null); setError(''); setEditName(''); setEditPin('') }}
                      className="text-sm font-semibold"
                      style={{ color: 'var(--ghrs-text-tertiary)' }}
                    >
                      ✕ إلغاء التعديل
                    </button>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🌱</span>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{child.name}</h3>
                          <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{child.login_code}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingId(child.id); setEditName(child.name); setEditPin(''); setError('') }}
                          className="p-2 rounded-lg transition-colors"
                          style={{ background: 'var(--ghrs-blue-50)', color: 'var(--ghrs-blue-600)' }}
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteChild(child.id, child.name)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-500)' }}
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Login Code */}
                    <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>👤 كود الدخول:</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold font-mono tracking-widest px-4 py-2 rounded-xl" style={{ background: 'var(--ghrs-bg-card)', border: '2px solid var(--ghrs-green-200)', color: 'var(--ghrs-green-700)' }}>
                          {child.login_code}
                        </span>
                        <button
                          onClick={() => copyLoginCode(child.login_code)}
                          className="px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                          style={{
                            background: copiedId === child.login_code ? 'var(--ghrs-green-500)' : 'var(--ghrs-bg-card)',
                            color: copiedId === child.login_code ? 'white' : 'var(--ghrs-green-700)',
                            border: `1px solid ${copiedId === child.login_code ? 'var(--ghrs-green-500)' : 'var(--ghrs-green-300)'}`
                          }}
                        >
                          {copiedId === child.login_code ? '✓ تم' : '📋 نسخ'}
                        </button>
                      </div>
                    </div>

                    {/* Login Link */}
                    <button
                      onClick={() => copyLoginLink(child.login_code)}
                      className="w-full py-2 px-4 rounded-xl text-sm font-bold transition-colors"
                      style={{ background: 'var(--ghrs-amber-500)', color: 'white' }}
                    >
                      📋 نسخ رابط الدخول
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {children.length === 0 && !showAdd && (
            <EmptyState
              icon="👶"
              title="لم تتم إضافة أي أطفال بعد"
              description="أضف أطفالك لبدء مغامرة النمو معاً"
              action={
                <button onClick={() => setShowAdd(true)} className="ghrs-btn-primary">
                  + أضف أول طفل
                </button>
              }
            />
          )}
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
