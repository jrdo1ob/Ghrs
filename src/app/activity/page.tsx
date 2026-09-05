'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import { getCurrentUser, AuthUser } from '@/lib/auth/helper'
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency'
import { StarIcon, CoinIcon, CheckIcon, RejectIcon, ClockIcon, ChildIcon, TasksIcon, EditIcon, CopyIcon, DeleteIcon } from '@/components/icons'

interface ActivityEvent {
  id: string
  type: 'completed' | 'approved' | 'rejected' | 'revoked'
  child_name: string
  task_title: string
  xp_amount: number
  performed_by: string | null
  timestamp: string
  description: string | null
  completion_id: string | null
  approved: boolean | null
}

export default function ActivityLogPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterChild, setFilterChild] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [children, setChildren] = useState<any[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<ActivityEvent | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { format: fmtMoney } = useFamilyCurrency()

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser()
      if (!user || user.role === 'child') { router.push('/family-login'); return }
      setAuthUser(user)

      const { data: childrenData } = await supabase.from('members').select('id, name').eq('family_id', user.familyId).eq('role', 'child')
      setChildren(childrenData || [])

      await loadEvents(user.familyId, 'all', 'all')
      setLoading(false)
    }
    init()
  }, [])

  const loadEvents = async (familyId: string, childFilter: string, typeFilter: string) => {
    // Step 1: Get ALL completions (1 query)
    const { data: completions } = await supabase
      .from('task_completions')
      .select('id, task_id, member_id, approved, completed_at, rejected_by, rejected_at')
      .order('completed_at', { ascending: false })
      .limit(100)

    if (!completions || completions.length === 0) {
      setEvents([])
      return
    }

    // Step 2: Collect all IDs for batch queries
    const taskIds = [...new Set(completions.map(c => c.task_id))]
    const memberIds = [...new Set(completions.map(c => c.member_id))]
    const completionIds = completions.map(c => c.id)

    // Step 3: Batch fetch tasks (1 query)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, family_id')
      .in('id', taskIds)

    // Step 4: Batch fetch members (1 query) - both children and performers
    const { data: members } = await supabase
      .from('members')
      .select('id, name, family_id')
      .in('id', memberIds)

    // Step 5: Batch fetch latest history for ALL completions (1 query)
    // Get all histories, then pick the latest per completion in memory
    const { data: allHistories } = await supabase
      .from('task_approval_history')
      .select('completion_id, action, performed_by, created_at')
      .in('completion_id', completionIds)
      .order('created_at', { ascending: false })

    // Step 6: Collect performer IDs from histories and batch fetch them (1 query)
    const performerIds = [...new Set(
      (allHistories || [])
        .map(h => h.performed_by)
        .filter((id): id is string => id !== null)
    )]

    const { data: performers } = performerIds.length > 0
      ? await supabase.from('members').select('id, name').in('id', performerIds)
      : { data: [] }

    // Step 7: Build Maps for O(1) lookup
    const tasksById = new Map((tasks || []).map(t => [t.id, t]))
    const membersById = new Map((members || []).map(m => [m.id, m]))
    const performersById = new Map((performers || []).map(p => [p.id, p]))

    // Build latest history per completion (first entry is latest due to order)
    const latestHistoryByCompletion = new Map<string, { completion_id: string; action: string; performed_by: string | null; created_at: string }>()
    for (const h of allHistories || []) {
      if (!latestHistoryByCompletion.has(h.completion_id)) {
        latestHistoryByCompletion.set(h.completion_id, h)
      }
    }

    // Step 8: Assemble events WITHOUT any queries
    const allEvents: ActivityEvent[] = []

    for (const c of completions) {
      const task = tasksById.get(c.task_id)
      const member = membersById.get(c.member_id)

      if (!task || !member || task.family_id !== familyId) continue
      if (childFilter !== 'all' && c.member_id !== childFilter) continue

      const latestHistory = latestHistoryByCompletion.get(c.id)
      
      // The event type is the LATEST action
      // Normalize 'revoke' and 'revoked' to a single value 'revoked'
      const eventType = (latestHistory?.action === 'revoke' || latestHistory?.action === 'revoked')
        ? 'revoked'
        : (latestHistory?.action || 'completed')
      
      // Only show performer for administrative actions (approved, rejected, revoked)
      // NOT for ordinary completions - the child is the subject, not an administrative actor
      const isAdministrativeAction = eventType === 'approved' || eventType === 'rejected' || eventType === 'revoked'
      const performer = isAdministrativeAction && latestHistory?.performed_by 
        ? performersById.get(latestHistory.performed_by) 
        : null

      // Filter logic (same as before)
      let shouldInclude = true
      if (typeFilter !== 'all') {
        if (typeFilter === 'completed') {
          shouldInclude = (c.approved === null)
        } else if (typeFilter === 'approved') {
          shouldInclude = (c.approved === true)
        } else if (typeFilter === 'rejected') {
          shouldInclude = (c.approved === false)
        } else if (typeFilter === 'revoked') {
          shouldInclude = (latestHistory?.action === 'revoked')
        } else {
          shouldInclude = (typeFilter === (c.approved === null ? 'pending' : c.approved === true ? 'approved' : 'rejected'))
        }
      }
      if (!shouldInclude) continue

      allEvents.push({
        id: `comp-${c.id}`,
        type: eventType as ActivityEvent['type'],
        child_name: member.name,
        task_title: task.title,
        xp_amount: 0,
        performed_by: performer?.name || null,
        timestamp: latestHistory?.created_at || c.completed_at,
        description: null,
        completion_id: c.id,
        approved: c.approved,
      })
    }

    // Sort by timestamp descending
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setEvents(allEvents)
  }

  const handleFilterChange = async (child: string, type: string) => {
    setFilterChild(child)
    setFilterType(type)
    if (authUser) await loadEvents(authUser.familyId, child, type)
  }

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
      await loadEvents(authUser.familyId, filterChild, filterType)
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
      await loadEvents(authUser.familyId, filterChild, filterType)
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
      // Call secure server-side API
      const response = await fetch('/api/tasks/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completionId, reason: revokeReason || null }),
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
      await loadEvents(authUser.familyId, filterChild, filterType)
    } catch (err) {
      console.error('[GHRS] Revoke error:', err)
      setToast({ type: 'error', message: 'حدث خطأ أثناء سحب الاعتماد' })
    } finally {
      setProcessingId(null)
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'completed': return '🟡'
      case 'approved': return '🟢'
      case 'rejected': return '🔴'
      case 'revoked': return '↩️'
      default: return '⚪'
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

  const getEventVerb = (type: string) => {
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
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>هل أنت متأكد من سحب اعتماد هذه المهمة؟ سيتم خصم النقاط.</p>
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
          <PageHeader title="سجل النشاط" subtitle="إدارة اعتماد إنجازات المهام" backHref="/dashboard" />

          {/* Filters */}
          <div className="mb-6">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              <button onClick={() => handleFilterChange(filterChild, 'all')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{ background: filterType === 'all' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'all' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                الكل
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'completed')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{ background: filterType === 'completed' ? 'var(--ghrs-amber-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'completed' ? 'var(--ghrs-amber-700)' : 'var(--ghrs-text-secondary)' }}>
                🟡 إنجاز
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'approved')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{ background: filterType === 'approved' ? 'var(--ghrs-green-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'approved' ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)' }}>
                🟢 اعتماد
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'rejected')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{ background: filterType === 'rejected' ? 'var(--ghrs-red-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'rejected' ? 'var(--ghrs-red-700)' : 'var(--ghrs-text-secondary)' }}>
                🔴 رفض
              </button>
              <button onClick={() => handleFilterChange(filterChild, 'revoked')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{ background: filterType === 'revoked' ? 'var(--ghrs-purple-100)' : 'var(--ghrs-bg-tertiary)', color: filterType === 'revoked' ? 'var(--ghrs-purple-700)' : 'var(--ghrs-text-secondary)' }}>
                ↩️ سحب
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
            {events.map(event => (
              <div key={event.id} className="ghrs-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ghrs-green-50)' }}>
                    <ChildIcon size={20} color="var(--ghrs-green-600)" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{event.child_name}</span>
                      <span className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{getEventVerb(event.type)}</span>
                      <span className="font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>{event.task_title}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                        background: event.type === 'completed' ? 'var(--ghrs-amber-100)' :
                                   event.type === 'approved' ? 'var(--ghrs-green-100)' :
                                   event.type === 'rejected' ? 'var(--ghrs-red-100)' : 'var(--ghrs-purple-100)',
                        color: event.type === 'completed' ? 'var(--ghrs-amber-700)' :
                               event.type === 'approved' ? 'var(--ghrs-green-700)' :
                               event.type === 'rejected' ? 'var(--ghrs-red-700)' : 'var(--ghrs-purple-700)'
                      }}>
                        {getEventIcon(event.type)} {getEventLabel(event.type)}
                      </span>
                    </div>
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

          {events.length === 0 && (
            <EmptyState icon={<ClockIcon size={48} />} title="لا يوجد نشاط" description="لم تُسجل أي عمليات بعد" />
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  )
}
