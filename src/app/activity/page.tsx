'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { StarIcon, CoinIcon, CheckIcon, RejectIcon, ClockIcon, ChildIcon, TasksIcon, GiftsIcon } from '@/components/icons'

interface ActivityEvent {
  id: string
  type: 'completed' | 'approved' | 'rejected' | 'revoked'
  child_name: string
  task_title: string
  xp_amount: number
  money_amount: number
  performed_by: string | null
  timestamp: string
  description: string | null
  completion_id: string | null
  approved: boolean | null
  is_gift: boolean
}

export default function ActivityLogPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterChild, setFilterChild] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [children, setChildren] = useState<any[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<ActivityEvent | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()
  const { format: fmtMoney } = useFamilyCurrency()

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      // Children list is folded into the events API response
      await loadEvents('all', 'all')
      setLoading(false)
    }
    init()
  }, [])

  const loadEvents = async (childFilter: string, typeFilter: string) => {
    try {
      const response = await fetch('/api/activity/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_filter: childFilter, type_filter: typeFilter }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setEvents([])
        return
      }

      setEvents(result.events || [])
      setChildren(result.children || [])
    } catch (err) {
      console.error('[GHRS] Load events error:', err)
      setEvents([])
    }
  }

  const handleFilterChange = async (child: string, type: string) => {
    setFilterChild(child)
    setFilterType(type)
    await loadEvents(child, type)
  }

  // Client-side filtered events (category + search)
  const filteredEvents = useMemo(() => {
    let result = events

    // Category filter (gift vs task)
    if (filterCategory === 'gift') {
      result = result.filter(e => e.is_gift)
    } else if (filterCategory === 'task') {
      result = result.filter(e => !e.is_gift)
    }

    // Text search (child name + gift/task title)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(e =>
        e.child_name.toLowerCase().includes(q) ||
        e.task_title.toLowerCase().includes(q)
      )
    }

    return result
  }, [events, filterCategory, searchQuery])

  const handleApprove = async (completionId: string) => {
    if (!authUser) return
    if (processingId === completionId) return
    setProcessingId(completionId)

    try {
      // Call secure server-side API
      const response = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completionId, approve: true }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء الاعتماد' })
        return
      }

      setToast({ type: 'success', message: 'تمت الموافقة!' })
      // Reload events
      await loadEvents(filterChild, filterType)
    } catch (err) {
      console.error('[GHRS] Approve error:', err)
      setToast({ type: 'error', message: 'حدث خطأ أثناء الاعتماد' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (completionId: string) => {
    if (!authUser) return
    if (processingId === completionId) return
    setProcessingId(completionId)

    try {
      // Call secure server-side API
      const response = await fetch('/api/tasks/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completionId }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء الرفض' })
        return
      }

      setToast({ type: 'success', message: 'تم رفض الإنجاز' })
      // Reload events
      await loadEvents(filterChild, filterType)
    } catch (err) {
      console.error('[GHRS] Reject error:', err)
      setToast({ type: 'error', message: 'حدث خطأ أثناء الرفض' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRevoke = async (completionId: string) => {
    if (!authUser) return
    if (processingId === completionId) return
    setProcessingId(completionId)

    try {
      // Find the event to determine if it's a gift or task
      const event = revokeConfirm
      const isGift = event?.is_gift || false

      // Route to correct API: gift revoke vs task revoke
      const url = isGift ? '/api/gifts/revoke' : '/api/tasks/revoke'
      const body = isGift
        ? { redemption_id: completionId, reason: revokeReason || null }
        : { completion_id: completionId, reason: revokeReason || null }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء سحب الاعتماد' })
        return
      }

      setToast({ type: 'success', message: 'تم سحب الاعتماد بنجاح' })
      setRevokeConfirm(null)
      setRevokeReason('')
      // Reload events
      await loadEvents(filterChild, filterType)
    } catch (err) {
      console.error('[GHRS] Revoke error:', err)
      setToast({ type: 'error', message: 'حدث خطأ أثناء سحب الاعتماد' })
    } finally {
      setProcessingId(null)
    }
  }

  const getEventStatusIcon = (type: string) => {
    switch (type) {
      case 'completed': return <ClockIcon size={14} color="var(--ghrs-amber-600)" />
      case 'approved': return <CheckIcon size={14} color="var(--ghrs-green-600)" />
      case 'rejected': return <RejectIcon size={14} color="var(--ghrs-red-600)" />
      case 'revoked': return <RejectIcon size={14} color="var(--ghrs-purple-600)" />
      default: return <ClockIcon size={14} color="var(--ghrs-text-tertiary)" />
    }
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'completed': return 'إنجاز'
      case 'approved': return 'اعتماد'
      case 'rejected': return 'رفض'
      case 'revoked': return 'سحب الاعتماد'
      default: return type
    }
  }

  const getEventVerb = (type: string, isGift: boolean = false) => {
    if (isGift) {
      switch (type) {
        case 'completed': return 'طلبت'
        case 'approved': return 'تم اعتماد طلب'
        case 'rejected': return 'تم رفض طلب'
        case 'revoked': return 'تم سحب اعتماد'
        default: return 'طلبت'
      }
    }
    switch (type) {
      case 'completed': return 'أنجز'
      case 'approved': return 'تم اعتماد إنجاز'
      case 'rejected': return 'تم رفض إنجاز'
      case 'revoked': return 'تم سحب اعتماد'
      default: return 'أنجز'
    }
  }

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
      {revokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setRevokeConfirm(null)}>
          <div className="ghrs-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--ghrs-red-600)' }}>سحب الاعتماد</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              {revokeConfirm?.is_gift
                ? 'هل أنت متأكد من سحب اعتماد هذا الطلب؟ سيتم رد النقاط والرصيد.'
                : 'هل أنت متأكد من سحب اعتماد هذه المهمة؟ سيتم خصم النقاط.'}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--ghrs-text-secondary)' }}>السبب (اختياري)</label>
              <input type="text" value={revokeReason} onChange={e => setRevokeReason(e.target.value)} className="ghrs-input w-full" placeholder="مثال: تم الاعتماد بالخطأ" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRevoke(revokeConfirm.completion_id!)} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--ghrs-red-500)', color: 'white' }}>سحب الاعتماد</button>
              <button onClick={() => { setRevokeConfirm(null); setRevokeReason('') }} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--ghrs-bg-tertiary)', color: 'var(--ghrs-text-secondary)' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader title="سجل النشاط" subtitle="سجل إنجازات وطلبات الأطفال" backHref="/dashboard" />

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو العنوان..."
              className="ghrs-input w-full"
              style={{ fontSize: '14px' }}
            />
          </div>

          {/* Filters */}
          <div className="mb-6">
            {/* Category Filter (Gift vs Task) */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              <button onClick={() => setFilterCategory('all')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterCategory === 'all' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: filterCategory === 'all' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                الكل
              </button>
              <button onClick={() => setFilterCategory('gift')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterCategory === 'gift' ? 'var(--ghrs-purple-100)' : 'var(--ghrs-bg-tertiary)', color: filterCategory === 'gift' ? 'var(--ghrs-purple-700)' : 'var(--ghrs-text-secondary)' }}>
                <GiftsIcon size={14} /> الهدايا
              </button>
              <button onClick={() => setFilterCategory('task')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterCategory === 'task' ? 'var(--ghrs-amber-100)' : 'var(--ghrs-bg-tertiary)', color: filterCategory === 'task' ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-secondary)' }}>
                <TasksIcon size={14} /> المهام
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              <button onClick={() => handleFilterChange(filterChild, 'all')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterType === 'all' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'all' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                الكل
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'completed')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterType === 'completed' ? 'var(--ghrs-amber-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'completed' ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-secondary)' }}>
                <ClockIcon size={12} /> إنجاز
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'approved')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterType === 'approved' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'approved' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                <CheckIcon size={12} /> اعتماد
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'rejected')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterType === 'rejected' ? 'var(--ghrs-red-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'rejected' ? 'var(--ghrs-red-700)' : 'var(--ghrs-text-secondary)' }}>
                <RejectIcon size={12} /> رفض
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'revoked')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                style={{ background: filterType === 'revoked' ? 'var(--ghrs-purple-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'revoked' ? 'var(--ghrs-purple-700)' : 'var(--ghrs-text-secondary)' }}>
                <RejectIcon size={12} /> سحب
              </button>
            </div>

            {/* Child Filter */}
            {children.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button onClick={() => handleFilterChange('all', filterType)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                  style={{ background: filterChild === 'all' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: filterChild === 'all' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                  الجميع
                </button>
                {children.map(c => (
                  <button key={c.id} onClick={() => handleFilterChange(c.id, filterType)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                    style={{ background: filterChild === c.id ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: filterChild === c.id ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Events List */}
          <div className="space-y-3">
            {filteredEvents.map(event => (
              <div key={event.id} className="ghrs-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: event.is_gift ? 'var(--ghrs-purple-50)' : 'var(--ghrs-green-50)' }}>
                    {event.is_gift
                      ? <GiftsIcon size={20} color="var(--ghrs-purple-600)" />
                      : <ChildIcon size={20} color="var(--ghrs-green-600)" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{event.child_name}</span>
                      <span className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{getEventVerb(event.type, event.is_gift)}</span>
                      <span className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{event.task_title}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Category badge */}
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1" style={{
                        background: event.is_gift ? 'var(--ghrs-purple-100)' : 'var(--ghrs-amber-100)',
                        color: event.is_gift ? 'var(--ghrs-purple-700)' : 'var(--ghrs-amber-700)'
                      }}>
                        {event.is_gift ? <GiftsIcon size={12} /> : <TasksIcon size={12} />}
                        {event.is_gift ? 'هدية' : 'مهمة'}
                      </span>
                      {/* Status badge */}
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1" style={{
                        background: event.type === 'completed' ? 'var(--ghrs-amber-100)' :
                                   event.type === 'approved' ? 'var(--ghrs-green-100)' :
                                   event.type === 'rejected' ? 'var(--ghrs-red-100)' : 'var(--ghrs-purple-100)',
                        color: event.type === 'completed' ? 'var(--ghrs-amber-700)' :
                               event.type === 'approved' ? 'var(--ghrs-green-700)' :
                               event.type === 'rejected' ? 'var(--ghrs-red-700)' : 'var(--ghrs-purple-700)'
                      }}>
                        {getEventStatusIcon(event.type)} {getEventLabel(event.type)}
                      </span>
                    </div>
                    {/* XP/Money amounts for gift events */}
                    {event.is_gift && (event.xp_amount > 0 || event.money_amount > 0) && (
                      <div className="flex items-center gap-3 mb-1">
                        {event.xp_amount > 0 && (
                          <span className="text-xs font-bold" style={{ color: 'var(--ghrs-amber-600)' }}>
                            <StarIcon size={12} className="inline" /> {event.xp_amount} XP
                          </span>
                        )}
                        {event.money_amount > 0 && (
                          <span className="text-xs font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                            <CoinIcon size={12} className="inline" /> {fmtMoney(event.money_amount)}
                          </span>
                        )}
                      </div>
                    )}
                    {event.performed_by && (
                      <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        بواسطة: {event.performed_by}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {new Date(event.timestamp).toLocaleString('ar')}
                    </p>

                    {/* Approval Actions */}
                    {event.approved === null && event.completion_id && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleApprove(event.completion_id!)} disabled={processingId === event.completion_id} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-green-500)', color: 'white' }}>
                          <CheckIcon size={14} className="inline" /> {processingId === event.completion_id ? 'جاري...' : 'اعتماد'}
                        </button>
                        <button onClick={() => handleReject(event.completion_id!)} disabled={processingId === event.completion_id} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-red-500)', color: 'white' }}>
                          <RejectIcon size={14} className="inline" /> {processingId === event.completion_id ? 'جاري...' : 'رفض'}
                        </button>
                      </div>
                    )}

                    {event.approved === true && event.completion_id && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setRevokeConfirm(event)} disabled={processingId === event.completion_id} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--ghrs-red-50)', color: 'var(--ghrs-red-600)', border: '1px solid var(--ghrs-red-200)' }}>
                          <RejectIcon size={14} className="inline" /> سحب الاعتماد
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <EmptyState icon={<ClockIcon size={48} />} title="لا يوجد نشاط" description={searchQuery || filterCategory !== 'all' ? 'لا توجد نتائج مطابقة للبحث' : 'لم تُسجل أي عمليات بعد'} />
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
