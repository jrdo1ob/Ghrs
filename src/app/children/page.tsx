'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'

export default function ChildrenPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [children, setChildren] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])
  const [family, setFamily] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'children' | 'parents'>('children')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPin, setEditPin] = useState('')
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }

      setAuthUser(user)

      const { data: familyData } = await supabase
        .from('families').select('*').eq('id', user.familyId).single()

      setFamily(familyData)

      // Get children
      const { data: childrenData } = await supabase
        .from('members').select('*')
        .eq('family_id', user.familyId)
        .eq('role', 'child')
        .order('created_at', { ascending: true })

      setChildren(childrenData || [])

      // Get parents (excluding the current owner if they logged in via supabase)
      const { data: parentsData } = await supabase
        .from('members').select('*')
        .eq('family_id', user.familyId)
        .in('role', ['parent', 'owner'])
        .order('created_at', { ascending: true })

      setParents(parentsData || [])
      setLoading(false)
    }

    getData()
  }, [])

  const generateLoginCode = async (role: 'child' | 'parent') => {
    if (!family || !authUser) return ''
    const { data, error } = await supabase.rpc('generate_unique_login_code', {
      p_family_code: family.code,
      p_role: role
    })
    if (error) {
      // Fallback to old method
      const { count } = await supabase
        .from('members').select('*', { count: 'exact', head: true })
        .eq('family_id', authUser.familyId).eq('role', role)
      const prefix = role === 'child' ? '100' : '000'
      return `${family.code}-${prefix + (count || 0) + 1}`
    }
    return data
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!authUser || !newName.trim() || !newPin) return

    const role = activeTab === 'children' ? 'child' : 'parent'
    const loginCode = await generateLoginCode(role)

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({ family_id: authUser.familyId, name: newName, role, login_code: loginCode })
      .select().single()

    if (memberError) { setError(memberError.message); return }

    const { error: pinError } = await supabase
      .rpc('set_member_pin', { p_member_id: member.id, p_pin: newPin })

    if (pinError) { setError(pinError.message); return }

    if (role === 'child') {
      setChildren([...children, { ...member }])
    } else {
      setParents([...parents, { ...member }])
    }

    setShowAdd(false)
    setNewName('')
    setNewPin('')
    setToast({ type: 'success', message: `تم إضافة ${member.name} بنجاح!` })
  }

  const handleUpdateName = async (memberId: string) => {
    setError('')
    if (!editName.trim()) { setError('الاسم لا يمكن أن يكون فارغاً'); return }

    const { error } = await supabase
      .from('members').update({ name: editName }).eq('id', memberId)

    if (error) { setError(error.message); return }

    setChildren(children.map(c => c.id === memberId ? { ...c, name: editName } : c))
    setParents(parents.map(p => p.id === memberId ? { ...p, name: editName } : p))
    setEditingId(null)
    setToast({ type: 'success', message: 'تم تعديل الاسم!' })
  }

  const handleUpdatePin = async (memberId: string) => {
    setError('')
    if (!editPin || editPin.length < 4) { setError('الرمز يجب أن يكون 4 أرقام على الأقل'); return }

    const { error } = await supabase
      .rpc('set_member_pin', { p_member_id: memberId, p_pin: editPin })

    if (error) { setError(error.message); return }

    setEditingId(null)
    setToast({ type: 'success', message: 'تم تعديل رمز PIN!' })
  }

  const handleDelete = async (memberId: string, memberName: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${memberName}"؟`)) return

    const { error } = await supabase.from('members').delete().eq('id', memberId)
    if (error) { setError(error.message); return }

    setChildren(children.filter(c => c.id !== memberId))
    setParents(parents.filter(p => p.id !== memberId))
    setToast({ type: 'success', message: `تم حذف ${memberName}` })
  }

  const copyLoginCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyLoginLink = async (code: string) => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/family-login?code=${code}`
    await navigator.clipboard.writeText(link)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const currentList = activeTab === 'children' ? children : parents
  const addLabel = activeTab === 'children' ? 'إضافة طفل' : 'إضافة ولي أمر'
  const emptyLabel = activeTab === 'children' ? 'أطفال' : 'أهل العائلة'

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto"><div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div></div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader 
            title="إدارة أفراد العائلة"
            subtitle="إضافة وتعديل ملفات الأبناء وأهل العائلة"
            backHref="/dashboard"
            action={
              <button onClick={() => { setShowAdd(true); setNewName(''); setNewPin('') }} className="ghrs-btn-primary">
                + {addLabel}
              </button>
            }
          />

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setActiveTab('children'); setShowAdd(false); setEditingId(null) }}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeTab === 'children' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)',
                color: activeTab === 'children' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)',
                border: `2px solid ${activeTab === 'children' ? 'var(--ghrs-green-300)' : 'transparent'}`
              }}
            >
              👶 الأطفال ({children.length})
            </button>
            <button
              onClick={() => { setActiveTab('parents'); setShowAdd(false); setEditingId(null) }}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeTab === 'parents' ? 'var(--ghrs-blue-50)' : 'var(--ghrs-bg-tertiary)',
                color: activeTab === 'parents' ? 'var(--ghrs-blue-600)' : 'var(--ghrs-text-secondary)',
                border: `2px solid ${activeTab === 'parents' ? 'var(--ghrs-blue-200)' : 'transparent'}`
              }}
            >
              👨‍👩‍👧 أهل العائلة ({parents.length})
            </button>
          </div>

          {error && <div className="mb-4 p-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)' }}>{error}</div>}

          {/* Add Form */}
          {showAdd && (
            <div className="ghrs-card p-6 mb-6 ghrs-animate-scale-in">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>{addLabel}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الاسم</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required className="ghrs-input" placeholder={activeTab === 'children' ? 'سارة' : 'شمه'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>رمز PIN (4-6 أرقام)</label>
                  <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} required className="ghrs-input text-center text-xl tracking-widest font-mono" placeholder="1234" maxLength={6} dir="ltr" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="ghrs-btn-primary">إضافة</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-4">
            {currentList.map((member) => (
              <div key={member.id} className="ghrs-card p-5">
                {editingId === member.id ? (
                  <div className="space-y-4">
                    <h3 className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>تعديل {member.name}</h3>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الاسم</label>
                      <div className="flex gap-2">
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="ghrs-input flex-1" />
                        <button onClick={() => handleUpdateName(member.id)} className="ghrs-btn-primary">حفظ</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>رمز PIN الجديد</label>
                      <div className="flex gap-2">
                        <input type="password" value={editPin} onChange={(e) => setEditPin(e.target.value)} className="ghrs-input flex-1 text-center tracking-widest font-mono" placeholder="1234" maxLength={6} dir="ltr" />
                        <button onClick={() => handleUpdatePin(member.id)} className="ghrs-btn-primary" style={{ background: 'var(--ghrs-amber-500)' }}>حفظ الرمز</button>
                      </div>
                    </div>
                    <button onClick={() => { setEditingId(null); setError(''); setEditName(''); setEditPin('') }} className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>✕ إلغاء</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{member.role === 'child' ? '🌱' : member.role === 'owner' ? '👑' : '👩'}</span>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{member.name}</h3>
                          <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{member.login_code}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: member.role === 'owner' ? 'var(--ghrs-amber-50)' : member.role === 'parent' ? 'var(--ghrs-blue-50)' : 'var(--ghrs-green-50)', color: member.role === 'owner' ? 'var(--ghrs-amber-700)' : member.role === 'parent' ? 'var(--ghrs-blue-600)' : 'var(--ghrs-green-700)' }}>
                            {member.role === 'owner' ? '👑 مالك' : member.role === 'parent' ? '👩 ولي أمر' : '🌱 طفل'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(member.id); setEditName(member.name); setEditPin(''); setError('') }} className="p-2 rounded-lg" style={{ background: 'var(--ghrs-blue-50)', color: 'var(--ghrs-blue-600)' }}>✏️</button>
                        {member.role !== 'owner' && (
                          <button onClick={() => handleDelete(member.id, member.name)} className="p-2 rounded-lg" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-500)' }}>🗑️</button>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--ghrs-green-50)', border: '1px solid var(--ghrs-green-200)' }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>👤 كود الدخول:</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold font-mono tracking-widest px-4 py-2 rounded-xl" style={{ background: 'var(--ghrs-bg-card)', border: '2px solid var(--ghrs-green-200)', color: 'var(--ghrs-green-700)' }}>{member.login_code}</span>
                        <button onClick={() => copyLoginCode(member.login_code)} className="px-3 py-2 rounded-lg text-sm font-bold transition-colors" style={{ background: copiedId === member.login_code ? 'var(--ghrs-green-500)' : 'var(--ghrs-bg-card)', color: copiedId === member.login_code ? 'white' : 'var(--ghrs-green-700)', border: `1px solid ${copiedId === member.login_code ? 'var(--ghrs-green-500)' : 'var(--ghrs-green-300)'}` }}>
                          {copiedId === member.login_code ? '✓ تم' : '📋 نسخ'}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => copyLoginLink(member.login_code)} className="w-full py-2 px-4 rounded-xl text-sm font-bold transition-colors" style={{ background: 'var(--ghrs-amber-500)', color: 'white' }}>
                      📋 نسخ رابط الدخول
                    </button>
                    {member.role === 'child' && (
                      <button
                        onClick={() => {
                          const baseUrl = window.location.origin
                          const link = `${baseUrl}/family-login?code=${member.login_code}`
                          const msg = encodeURIComponent(`🌱 بطلنا المبدع!\nحديقتك في منصة غرس بانتظارك اليوم! اضغط على رابطك المباشر للبدء في حل المهام، سقاية الحديقة، وجمع النقاط 🏆✨\n\n🔗 رابط دخولك المباشر:\n${link}`)
                          window.open(`https://wa.me/?text=${msg}`, '_blank')
                        }}
                        className="w-full py-2 px-4 rounded-xl text-sm font-bold transition-colors mt-2"
                        style={{ background: '#25D366', color: 'white' }}
                      >
                        💬 مشاركة رابط الدخول على الواتساب
                      </button>
                    )}
                    {member.role !== 'child' && (
                      <button
                        onClick={() => {
                          const baseUrl = window.location.origin
                          const msg = encodeURIComponent(`🍃 مرحباً بك في تطبيق غرس العائلي!\nنرحب بك لتكون معنا في متابعة إنجازات أطفالنا، اعتماد المهام، وتشجيعهم نحو بناء عادات حسنة يومياً 🌟\n\n🔐 دخول صفحة الوالدين:\n${baseUrl}`)
                          window.open(`https://wa.me/?text=${msg}`, '_blank')
                        }}
                        className="w-full py-2 px-4 rounded-xl text-sm font-bold transition-colors mt-2"
                        style={{ background: '#25D366', color: 'white' }}
                      >
                        💬 مشاركة رابط الواتساب للوالدين
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {currentList.length === 0 && !showAdd && (
            <EmptyState
              icon={activeTab === 'children' ? '👶' : '👨‍👩‍👧'}
              title={`لم تتم إضافة أي ${emptyLabel} بعد`}
              description={activeTab === 'children' ? 'أضف أطفالك لبدء مغامرة النمو' : 'أضف أهل العائلة ل给他们 صلاحيات الإدارة'}
              action={<button onClick={() => setShowAdd(true)} className="ghrs-btn-primary">+ {addLabel}</button>}
            />
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
