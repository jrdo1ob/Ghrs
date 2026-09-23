'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { ChildIcon, CrownIcon, MotherIcon, LeafIcon, CopyIcon, CheckIcon, DeleteIcon, EditIcon, UserIcon, StarIcon, CoinIcon, SparkleIcon, ShieldIcon } from '@/components/icons'

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
  const [manualModal, setManualModal] = useState<{ child: any; type: 'reward' | 'penalty' } | null>(null)
  const [manualForm, setManualForm] = useState({ reason: '', currencyType: 'xp' as 'xp' | 'money', amount: 10 })
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [goalModal, setGoalModal] = useState<{ childId: string; childName: string; currentTarget: number } | null>(null)
  const [goalTarget, setGoalTarget] = useState(3)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      // All family data is read server-side via the authenticated data API
      const response = await fetch('/api/children/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) { router.push('/family-login'); return }

      setFamily(result.family)
      setChildren(result.children)
      setParents(result.parents)
      setLoading(false)
    }
    getData()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!authUser || !newName.trim() || !newPin) return
    const role = activeTab === 'children' ? 'child' : 'parent'
    const response = await fetch('/api/members/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, role, pin: newPin }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      setError(result.error || 'حدث خطأ'); return
    }
    const member = result.member
    if (role === 'child') setChildren([...children, { ...member }])
    else setParents([...parents, { ...member }])
    setShowAdd(false); setNewName(''); setNewPin('')
    setToast({ type: 'success', message: `تم إضافة ${member.name} بنجاح!` })
  }

  const handleUpdateName = async (memberId: string) => {
    setError('')
    if (!editName.trim()) { setError('الاسم لا يمكن أن يكون فارغاً'); return }
    const response = await fetch('/api/members/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, name: editName }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) { setError(result.error || 'حدث خطأ'); return }
    setChildren(children.map(c => c.id === memberId ? { ...c, name: editName } : c))
    setParents(parents.map(p => p.id === memberId ? { ...p, name: editName } : p))
    setEditingId(null); setToast({ type: 'success', message: 'تم تعديل الاسم!' })
  }

  const handleUpdatePin = async (memberId: string) => {
    setError('')
    if (!editPin || editPin.length < 4) { setError('الرمز يجب أن يكون 4 أرقام على الأقل'); return }
    const response = await fetch('/api/members/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, pin: editPin }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) { setError(result.error || 'حدث خطأ'); return }
    setEditingId(null); setToast({ type: 'success', message: 'تم تعديل رمز PIN!' })
  }

  const handleDelete = async (memberId: string, memberName: string) => {
    const response = await fetch('/api/members/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) { setError(result.error || 'حدث خطأ'); return }
    setChildren(children.filter(c => c.id !== memberId))
    setParents(parents.filter(p => p.id !== memberId))
    setToast({ type: 'success', message: `تم حذف ${memberName}` })
    setDeleteConfirm(null)
  }

  const handleManualAdjustment = async () => {
    if (!manualModal || !manualForm.reason.trim() || manualForm.amount <= 0) return
    setProcessingId(manualModal.child.id)

    const response = await fetch('/api/members/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: manualModal.child.id,
        type: manualModal.type,
        currency_type: manualForm.currencyType,
        amount: manualForm.amount,
        reason: manualForm.reason,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      setToast({ type: 'error', message: data.error || 'حدث خطأ' })
      setProcessingId(null); setManualModal(null); return
    }

    const appliedAmount = manualForm.currencyType === 'xp'
      ? Math.abs(data.xp_applied ?? 0)
      : Math.abs(data.money_applied ?? 0)

    setToast({
      type: 'success',
      message: manualModal.type === 'reward'
        ? `تم منح ${manualModal.child.name} مكافأة ${appliedAmount} ${manualForm.currencyType === 'xp' ? 'نقطة' : 'مالي'} بنجاح!`
        : `تم خصم ${appliedAmount} ${manualForm.currencyType === 'xp' ? 'نقطة' : 'مالي'} من ${manualModal.child.name}`
    })
    setProcessingId(null); setManualModal(null)
    setManualForm({ reason: '', currencyType: 'xp', amount: 10 })
  }

  const handleSetGoal = async () => {
    if (!goalModal) return
    setProcessingId(goalModal.childId)

    const response = await fetch('/api/child-mode/daily-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: goalModal.childId,
        target_tasks: goalTarget,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      setToast({ type: 'error', message: data.error || 'حدث خطأ' })
      setProcessingId(null); setGoalModal(null); return
    }

    setToast({ type: 'success', message: `تم تحديد الهدف اليومي: ${goalTarget} مهام` })
    setProcessingId(null); setGoalModal(null)
  }

  const copyLoginCode = async (code: string) => {
    await navigator.clipboard.writeText(code); setCopiedId(code); setTimeout(() => setCopiedId(null), 2000)
  }

  const copyLoginLink = async (code: string) => {
    const link = `${window.location.origin}/family-login?code=${code}`
    await navigator.clipboard.writeText(link); setCopiedId(code); setTimeout(() => setCopiedId(null), 2000)
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
      {deleteConfirm && (
        <ConfirmDialog
          show={!!deleteConfirm}
          title="حذف الفرد"
          message={`هل أنت متأكد من حذف "${deleteConfirm.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmText="حذف"
          cancelText="إلغاء"
          variant="danger"
          onConfirm={() => handleDelete(deleteConfirm.id, deleteConfirm.name)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      {goalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setGoalModal(null)}>
          <div className="ghrs-card p-6 w-full max-w-md ghrs-animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--ghrs-amber-600)' }}>
              🎯 تحديد الهدف اليومي
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              حدد عدد المهام اليومية التي يجب على {goalModal.childName} إنجازها
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold" style={{ color: 'var(--ghrs-text-secondary)' }}>عدد المهام</label>
              <input type="number" min="1" max="20" value={goalTarget} onChange={e => setGoalTarget(parseInt(e.target.value) || 1)} className="ghrs-input w-full text-center text-lg font-bold tabular-nums" />
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleSetGoal} disabled={processingId === goalModal.childId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{ background: 'var(--ghrs-amber-500)', color: 'white', opacity: processingId === goalModal.childId ? 0.6 : 1 }}>
                🎯 حفظ الهدف
              </button>
              <button onClick={() => setGoalModal(null)} className="ghrs-btn-secondary">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setManualModal(null)}>
          <div className="ghrs-card p-6 w-full max-w-md ghrs-animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2" style={{ color: manualModal.type === 'reward' ? 'var(--ghrs-green-600)' : 'var(--ghrs-red-600)' }}>
              {manualModal.type === 'reward' ? 'مكافأة فورية' : 'خصم / عقاب'}
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              {manualModal.type === 'reward' ? 'منح مكافأة لـ' : 'تطبيق خصم على'} {manualModal.child.name}
            </p>

            <div className="space-y-3">
              {/* Reason */}
              <div>
                <label className="ghrs-label">السبب / الوصف</label>
                <input type="text" value={manualForm.reason} onChange={e => setManualForm({ ...manualForm, reason: e.target.value })}
                  className="ghrs-input w-full" placeholder={manualModal.type === 'reward' ? 'مساعدة الجدة، خلق حسن، تميز في الاختبار' : 'عدم الالتزام، سلوك غير لائق، صراخ'} />
              </div>

              {/* Currency Type */}
              <div>
                <label className="ghrs-label">نوع العملة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setManualForm({ ...manualForm, currencyType: 'xp' })}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{ background: manualForm.currencyType === 'xp' ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)', color: manualForm.currencyType === 'xp' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${manualForm.currencyType === 'xp' ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}` }}>
                    <StarIcon size={14} /> XP
                  </button>
                  <button type="button" onClick={() => setManualForm({ ...manualForm, currencyType: 'money' })}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{ background: manualForm.currencyType === 'money' ? 'var(--ghrs-amber-50)' : 'var(--ghrs-bg-secondary)', color: manualForm.currencyType === 'money' ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-secondary)', border: `1px solid ${manualForm.currencyType === 'money' ? 'var(--ghrs-amber-300)' : 'var(--ghrs-border-default)'}` }}>
                    <CoinIcon size={14} /> مالي
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="ghrs-label">القيمة</label>
                <input type="number" step="0.001" min="0.001" value={manualForm.amount} onChange={e => setManualForm({ ...manualForm, amount: parseFloat(e.target.value) || 0 })} className="ghrs-input w-full text-center text-lg font-bold tabular-nums" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleManualAdjustment} disabled={!manualForm.reason.trim() || manualForm.amount <= 0 || processingId === manualModal.child.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{ background: manualModal.type === 'reward' ? 'var(--ghrs-green-500)' : 'var(--ghrs-red-500)', color: 'white', opacity: (!manualForm.reason.trim() || manualForm.amount <= 0 || processingId === manualModal.child.id) ? 0.6 : 1 }}>
                {manualModal.type === 'reward' ? <><SparkleIcon size={14} /> منح المكافأة</> : <><ShieldIcon size={14} /> تطبيق الخصم</>}
              </button>
              <button onClick={() => setManualModal(null)} className="ghrs-btn-secondary">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader title="إدارة أفراد العائلة" subtitle="إضافة وتعديل ملفات الأبناء وأهل العائلة" backHref="/dashboard"
            action={<button onClick={() => { setShowAdd(true); setNewName(''); setNewPin('') }} className="ghrs-btn-primary">+ {addLabel}</button>} />

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--ghrs-border-default)' }}>
            <button onClick={() => { setActiveTab('children'); setShowAdd(false); setEditingId(null) }}
              className="px-4 py-2.5 text-sm font-bold transition-all border-b-2"
              style={{ borderColor: activeTab === 'children' ? 'var(--ghrs-green-600)' : 'transparent', color: activeTab === 'children' ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)' }}>
              الأطفال ({children.length})
            </button>
            <button onClick={() => { setActiveTab('parents'); setShowAdd(false); setEditingId(null) }}
              className="px-4 py-2.5 text-sm font-bold transition-all border-b-2"
              style={{ borderColor: activeTab === 'parents' ? 'var(--ghrs-green-600)' : 'transparent', color: activeTab === 'parents' ? 'var(--ghrs-text-primary)' : 'var(--ghrs-text-tertiary)' }}>
              أهل العائلة ({parents.length})
            </button>
          </div>

          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>{error}</div>}

          {/* Add Form */}
          {showAdd && (
            <div className="ghrs-card p-5 mb-5 ghrs-animate-scale-in">
              <h2 className="text-base font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>{addLabel}</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="ghrs-label">الاسم</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required className="ghrs-input" placeholder={activeTab === 'children' ? 'سارة' : 'شمه'} />
                </div>
                <div>
                  <label className="ghrs-label">رمز PIN (4-6 أرقام)</label>
                  <input type="password" inputMode="numeric" pattern="[0-9]*" value={newPin} onChange={e => setNewPin(e.target.value)} required className="ghrs-input text-center text-lg tracking-widest font-mono" placeholder="••••" maxLength={6} dir="ltr" autoComplete="one-time-code" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="ghrs-btn-primary">إضافة</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="ghrs-btn-secondary">إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            {currentList.map(member => (
              <div key={member.id} className="ghrs-card p-4">
                {editingId === member.id ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>تعديل {member.name}</h3>
                    <div>
                      <label className="ghrs-label">الاسم</label>
                      <div className="flex gap-2">
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="ghrs-input flex-1" />
                        <button onClick={() => handleUpdateName(member.id)} className="ghrs-btn-primary flex-shrink-0">حفظ</button>
                      </div>
                    </div>
                    <div>
                      <label className="ghrs-label">رمز PIN الجديد</label>
                      <div className="flex gap-2">
                        <input type="password" inputMode="numeric" pattern="[0-9]*" value={editPin} onChange={e => setEditPin(e.target.value)} className="ghrs-input flex-1 text-center tracking-widest font-mono" placeholder="••••" maxLength={6} dir="ltr" autoComplete="one-time-code" />
                        <button onClick={() => handleUpdatePin(member.id)} className="ghrs-btn-primary flex-shrink-0">حفظ الرمز</button>
                      </div>
                    </div>
                    <button onClick={() => { setEditingId(null); setError(''); setEditName(''); setEditPin('') }} className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>إلغاء</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: member.role === 'owner' ? 'var(--ghrs-amber-50)'
                              : member.role === 'parent' ? 'var(--ghrs-blue-50)'
                              : 'var(--ghrs-green-50)',
                          }}
                        >
                          {member.role === 'child' ? <LeafIcon size={20} color="var(--ghrs-green-600)" /> : member.role === 'owner' ? <CrownIcon size={20} color="var(--ghrs-amber-600)" /> : <MotherIcon size={20} color="var(--ghrs-blue-600)" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--ghrs-text-primary)' }}>{member.name}</h3>
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--ghrs-text-tertiary)' }}>{member.login_code}</p>
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                            background: member.role === 'owner' ? 'var(--ghrs-amber-50)'
                              : member.role === 'parent' ? 'var(--ghrs-blue-50)'
                              : 'var(--ghrs-green-50)',
                            color: member.role === 'owner' ? 'var(--ghrs-amber-700)'
                              : member.role === 'parent' ? 'var(--ghrs-blue-600)'
                              : 'var(--ghrs-green-700)',
                          }}>
                            {member.role === 'owner' ? 'مالك' : member.role === 'parent' ? 'ولي أمر' : 'طفل'}
                          </span>
                          {member.role === 'child' && (
                            <Link href={`/children/${member.id}`} className="text-[10px] font-semibold mt-1 inline-block" style={{ color: 'var(--ghrs-green-600)' }}>
                              التفاصيل ←
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => { setEditingId(member.id); setEditName(member.name); setEditPin(''); setError('') }} className="p-2 rounded-lg" style={{ background: 'var(--ghrs-bg-secondary)', color: 'var(--ghrs-text-secondary)' }}><EditIcon size={14} /></button>
                        {member.role !== 'owner' && (
                          <button onClick={() => setDeleteConfirm({ id: member.id, name: member.name })} className="p-2 rounded-lg" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)' }}><DeleteIcon size={14} /></button>
                        )}
                      </div>
                    </div>

                    {/* Manual Action Buttons (only for children) */}
                    {member.role === 'child' && (
                      <div className="flex gap-2 mb-3">
                        <button onClick={() => { setManualModal({ child: member, type: 'reward' }); setManualForm({ reason: '', currencyType: 'xp', amount: 10 }) }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: 'var(--ghrs-green-50)', color: 'var(--ghrs-green-700)', border: '1px solid var(--ghrs-green-200)' }}>
                          <SparkleIcon size={12} /> مكافأة فورية
                        </button>
                        <button onClick={() => { setManualModal({ child: member, type: 'penalty' }); setManualForm({ reason: '', currencyType: 'xp', amount: 10 }) }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
                          <ShieldIcon size={12} /> خصم / عقاب
                        </button>
                        <button onClick={() => { setGoalModal({ childId: member.id, childName: member.name, currentTarget: 3 }); setGoalTarget(3) }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: 'var(--ghrs-amber-50)', color: 'var(--ghrs-amber-700)', border: '1px solid var(--ghrs-amber-200)' }}>
                          🎯 هدف يومي
                        </button>
                      </div>
                    )}

                    <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--ghrs-bg-secondary)', border: '1px solid var(--ghrs-border-default)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ghrs-text-tertiary)' }}>كود الدخول</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-mono tracking-widest px-3 py-1.5 rounded-lg flex-1" style={{ background: 'var(--ghrs-bg-card)', border: '1px solid var(--ghrs-border-default)', color: 'var(--ghrs-text-primary)' }}>{member.login_code}</span>
                        <button onClick={() => copyLoginCode(member.login_code)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" style={{ background: copiedId === member.login_code ? 'var(--ghrs-green-500)' : 'var(--ghrs-bg-card)', color: copiedId === member.login_code ? 'white' : 'var(--ghrs-text-secondary)', border: `1px solid ${copiedId === member.login_code ? 'var(--ghrs-green-500)' : 'var(--ghrs-border-default)'}` }}>
                          {copiedId === member.login_code ? '✓ تم' : 'نسخ'}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyLoginLink(member.login_code)} className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors" style={{ background: 'var(--ghrs-bg-secondary)', color: 'var(--ghrs-text-secondary)', border: '1px solid var(--ghrs-border-default)' }}>
                        نسخ رابط الدخول
                      </button>
                      {member.role === 'child' && (
                        <button onClick={() => { const link = `${window.location.origin}/family-login?code=${member.login_code}`; window.open(`https://wa.me/?text=${encodeURIComponent(`بطلنا المبدع!\nحديقتك في منصة غرس بانتظارك اليوم!\n\nرابط دخولك المباشر:\n${link}`)}`, '_blank') }}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors" style={{ background: '#25D366', color: 'white' }}>
                          واتساب
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {currentList.length === 0 && !showAdd && (
            <EmptyState icon={activeTab === 'children' ? <ChildIcon size={32} /> : <UserIcon size={32} />}
              title={`لم تتم إضافة أي ${emptyLabel} بعد`}
              description={activeTab === 'children' ? 'أضف أطفالك لبدء مغامرة النمو' : 'أضف أهل العائلة لإعطائهم صلاحيات الإدارة'}
              action={<button onClick={() => setShowAdd(true)} className="ghrs-btn-primary">+ {addLabel}</button>} />
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
