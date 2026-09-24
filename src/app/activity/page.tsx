'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ParentBottomNav,
  ParentSidebar,
  PageHeader,
  EmptyState,
  Toast,
  Skeleton,
} from '@/components/layout';
import { getCurrentUser, AuthUser } from '@/lib/auth/helper';
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency';
import {
  StarIcon,
  CoinIcon,
  CheckIcon,
  RejectIcon,
  ClockIcon,
  ChildIcon,
  TasksIcon,
  GiftsIcon,
} from '@/components/icons';

interface ActivityEvent {
  id: string;
  type: 'completed' | 'approved' | 'rejected' | 'revoked';
  child_name: string;
  task_title: string;
  xp_amount: number;
  money_amount: number;
  performed_by: string | null;
  timestamp: string;
  description: string | null;
  completion_id: string | null;
  approved: boolean | null;
  is_gift: boolean;
}

export default function ActivityLogPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChild, setFilterChild] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [children, setChildren] = useState<any[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<ActivityEvent | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();
  const { format: fmtMoney } = useFamilyCurrency();

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (!user || user.role === 'child') {
        router.push('/family-login');
        return;
      }
      setAuthUser(user);

      // Children list is folded into the events API response
      await loadEvents('all', 'all');
      setLoading(false);
    };
    init();
  }, []);

  const loadEvents = async (childFilter: string, typeFilter: string) => {
    try {
      const response = await fetch('/api/activity/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_filter: childFilter, type_filter: typeFilter }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setEvents([]);
        return;
      }

      setEvents(result.events || []);
      setChildren(result.children || []);
    } catch (err) {
      console.error('[GHRS] Load events error:', err);
      setEvents([]);
    }
  };

  const handleFilterChange = async (child: string, type: string) => {
    setFilterChild(child);
    setFilterType(type);
    await loadEvents(child, type);
  };

  // Client-side filtered events (category + search)
  const filteredEvents = useMemo(() => {
    let result = events;

    // Category filter (gift vs task)
    if (filterCategory === 'gift') {
      result = result.filter((e) => e.is_gift);
    } else if (filterCategory === 'task') {
      result = result.filter((e) => !e.is_gift);
    }

    // Text search (child name + gift/task title)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (e) => e.child_name.toLowerCase().includes(q) || e.task_title.toLowerCase().includes(q)
      );
    }

    return result;
  }, [events, filterCategory, searchQuery]);

  const handleApprove = async (completionId: string) => {
    if (!authUser) return;
    if (processingId === completionId) return;
    setProcessingId(completionId);

    try {
      // Call secure server-side API
      const response = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completionId, approve: true }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء الاعتماد' });
        return;
      }

      setToast({ type: 'success', message: 'تمت الموافقة!' });
      // Reload events
      await loadEvents(filterChild, filterType);
    } catch (err) {
      console.error('[GHRS] Approve error:', err);
      setToast({ type: 'error', message: 'حدث خطأ أثناء الاعتماد' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (completionId: string) => {
    if (!authUser) return;
    if (processingId === completionId) return;
    setProcessingId(completionId);

    try {
      // Call secure server-side API
      const response = await fetch('/api/tasks/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completionId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء الرفض' });
        return;
      }

      setToast({ type: 'success', message: 'تم رفض الإنجاز' });
      // Reload events
      await loadEvents(filterChild, filterType);
    } catch (err) {
      console.error('[GHRS] Reject error:', err);
      setToast({ type: 'error', message: 'حدث خطأ أثناء الرفض' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (completionId: string) => {
    if (!authUser) return;
    if (processingId === completionId) return;
    setProcessingId(completionId);

    try {
      // Find the event to determine if it's a gift or task
      const event = revokeConfirm;
      const isGift = event?.is_gift || false;

      // Route to correct API: gift revoke vs task revoke
      const url = isGift ? '/api/gifts/revoke' : '/api/tasks/revoke';
      const body = isGift
        ? { redemption_id: completionId, reason: revokeReason || null }
        : { completion_id: completionId, reason: revokeReason || null };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء سحب الاعتماد' });
        return;
      }

      setToast({ type: 'success', message: 'تم سحب الاعتماد بنجاح' });
      setRevokeConfirm(null);
      setRevokeReason('');
      // Reload events
      await loadEvents(filterChild, filterType);
    } catch (err) {
      console.error('[GHRS] Revoke error:', err);
      setToast({ type: 'error', message: 'حدث خطأ أثناء سحب الاعتماد' });
    } finally {
      setProcessingId(null);
    }
  };

  const getEventStatusIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <ClockIcon size={14} color="var(--ghrs-amber-600)" />;
      case 'approved':
        return <CheckIcon size={14} color="var(--ghrs-green-600)" />;
      case 'rejected':
        return <RejectIcon size={14} color="var(--ghrs-red-600)" />;
      case 'revoked':
        return <RejectIcon size={14} color="var(--ghrs-purple-600)" />;
      default:
        return <ClockIcon size={14} color="var(--ghrs-text-tertiary)" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'completed':
        return 'إنجاز';
      case 'approved':
        return 'اعتماد';
      case 'rejected':
        return 'رفض';
      case 'revoked':
        return 'سحب الاعتماد';
      default:
        return type;
    }
  };

  const getEventVerb = (type: string, isGift: boolean = false) => {
    if (isGift) {
      switch (type) {
        case 'completed':
          return 'طلبت';
        case 'approved':
          return 'تم اعتماد طلب';
        case 'rejected':
          return 'تم رفض طلب';
        case 'revoked':
          return 'تم سحب اعتماد';
        default:
          return 'طلبت';
      }
    }
    switch (type) {
      case 'completed':
        return 'أنجز';
      case 'approved':
        return 'تم اعتماد إنجاز';
      case 'rejected':
        return 'تم رفض إنجاز';
      case 'revoked':
        return 'تم سحب اعتماد';
      default:
        return 'أنجز';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
        <ParentBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      {revokeConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setRevokeConfirm(null)}
        >
          <div className="ghrs-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--ghrs-red-600)' }}>
              سحب الاعتماد
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
              {revokeConfirm?.is_gift
                ? 'هل أنت متأكد من سحب اعتماد هذا الطلب؟ سيتم رد النقاط والرصيد.'
                : 'هل أنت متأكد من سحب اعتماد هذه المهمة؟ سيتم خصم النقاط.'}
            </p>
            <div className="mb-4">
              <label className="ghrs-label">السبب (اختياري)</label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="ghrs-input w-full"
                placeholder="مثال: تم الاعتماد بالخطأ"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRevoke(revokeConfirm.completion_id!)}
                className="flex-1 ghrs-btn-danger"
              >
                سحب الاعتماد
              </button>
              <button
                onClick={() => {
                  setRevokeConfirm(null);
                  setRevokeReason('');
                }}
                className="flex-1 ghrs-btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader
            title="سجل النشاط"
            subtitle="سجل إنجازات وطلبات الأطفال"
            backHref="/dashboard"
          />

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو العنوان..."
              className="ghrs-input w-full"
              style={{ fontSize: '14px' }}
            />
          </div>

          {/* Filters */}
          <div className="mb-5">
            {/* Category Filter (Gift vs Task) */}
            <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
              {[
                {
                  id: 'all',
                  label: 'الكل',
                  color: 'var(--ghrs-green-700)',
                  bg: 'var(--ghrs-green-100)',
                },
                {
                  id: 'gift',
                  label: 'الهدايا',
                  icon: <GiftsIcon size={12} />,
                  color: 'var(--ghrs-purple-700)',
                  bg: 'var(--ghrs-purple-100)',
                },
                {
                  id: 'task',
                  label: 'المهام',
                  icon: <TasksIcon size={12} />,
                  color: 'var(--ghrs-amber-700)',
                  bg: 'var(--ghrs-amber-100)',
                },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id as any)}
                  className="px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                  style={{
                    background: filterCategory === f.id ? f.bg : 'var(--ghrs-bg-secondary)',
                    color: filterCategory === f.id ? f.color : 'var(--ghrs-text-secondary)',
                  }}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'completed', label: 'إنجاز', icon: <ClockIcon size={12} /> },
                { id: 'approved', label: 'اعتماد', icon: <CheckIcon size={12} /> },
                { id: 'rejected', label: 'رفض', icon: <RejectIcon size={12} /> },
                { id: 'revoked', label: 'سحب', icon: <RejectIcon size={12} /> },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleFilterChange(filterChild, s.id)}
                  className="px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
                  style={{
                    background: filterType === s.id ? 'var(--ghrs-bg-secondary)' : 'transparent',
                    color:
                      filterType === s.id
                        ? 'var(--ghrs-text-primary)'
                        : 'var(--ghrs-text-tertiary)',
                    border:
                      filterType === s.id
                        ? '1px solid var(--ghrs-border-default)'
                        : '1px solid transparent',
                  }}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>

            {/* Child Filter */}
            {children.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => handleFilterChange('all', filterType)}
                  className="px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap"
                  style={{
                    background: filterChild === 'all' ? 'var(--ghrs-bg-secondary)' : 'transparent',
                    color:
                      filterChild === 'all'
                        ? 'var(--ghrs-text-primary)'
                        : 'var(--ghrs-text-tertiary)',
                    border:
                      filterChild === 'all'
                        ? '1px solid var(--ghrs-border-default)'
                        : '1px solid transparent',
                  }}
                >
                  الجميع
                </button>
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleFilterChange(c.id, filterType)}
                    className="px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap"
                    style={{
                      background: filterChild === c.id ? 'var(--ghrs-bg-secondary)' : 'transparent',
                      color:
                        filterChild === c.id
                          ? 'var(--ghrs-text-primary)'
                          : 'var(--ghrs-text-tertiary)',
                      border:
                        filterChild === c.id
                          ? '1px solid var(--ghrs-border-default)'
                          : '1px solid transparent',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Events List */}
          <div className="space-y-2.5">
            {filteredEvents.map((event) => (
              <div key={event.id} className="ghrs-card p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: event.is_gift ? 'var(--ghrs-purple-50)' : 'var(--ghrs-green-50)',
                    }}
                  >
                    {event.is_gift ? (
                      <GiftsIcon size={20} color="var(--ghrs-purple-600)" />
                    ) : (
                      <ChildIcon size={20} color="var(--ghrs-green-600)" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span
                        className="text-sm font-bold"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {event.child_name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        {getEventVerb(event.type, event.is_gift)}
                      </span>
                      <span
                        className="text-sm font-bold truncate"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {event.task_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {/* Category badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ghrs-badge ${
                          event.is_gift ? 'ghrs-badge-info' : 'ghrs-badge-warning'
                        }`}
                      >
                        {event.is_gift ? <GiftsIcon size={10} /> : <TasksIcon size={10} />}
                        {event.is_gift ? 'هدية' : 'مهمة'}
                      </span>
                      {/* Status badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ghrs-badge ${
                          event.type === 'completed'
                            ? 'ghrs-badge-warning'
                            : event.type === 'approved'
                              ? 'ghrs-badge-success'
                              : event.type === 'rejected'
                                ? 'ghrs-badge-error'
                                : 'ghrs-badge-info'
                        }`}
                      >
                        {getEventStatusIcon(event.type)} {getEventLabel(event.type)}
                      </span>
                    </div>
                    {/* XP/Money amounts for gift events */}
                    {event.is_gift && (event.xp_amount > 0 || event.money_amount > 0) && (
                      <div className="flex items-center gap-3 mb-1">
                        {event.xp_amount > 0 && (
                          <span
                            className="text-xs font-semibold tabular-nums"
                            style={{ color: 'var(--ghrs-text-secondary)' }}
                          >
                            <StarIcon size={12} className="inline" /> {event.xp_amount} XP
                          </span>
                        )}
                        {event.money_amount > 0 && (
                          <span
                            className="text-xs font-semibold tabular-nums"
                            style={{ color: 'var(--ghrs-text-secondary)' }}
                          >
                            <CoinIcon size={12} className="inline" /> {fmtMoney(event.money_amount)}
                          </span>
                        )}
                      </div>
                    )}
                    {event.performed_by && (
                      <p className="text-[11px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        بواسطة: {event.performed_by}
                      </p>
                    )}
                    <p className="text-[11px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                      {new Date(event.timestamp).toLocaleString('ar')}
                    </p>

                    {/* Approval Actions */}
                    {event.approved === null && event.completion_id && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApprove(event.completion_id!)}
                          disabled={processingId === event.completion_id}
                          className="flex-1 ghrs-btn-primary text-xs py-2 justify-center"
                        >
                          <CheckIcon size={12} />{' '}
                          {processingId === event.completion_id ? 'جاري...' : 'اعتماد'}
                        </button>
                        <button
                          onClick={() => handleReject(event.completion_id!)}
                          disabled={processingId === event.completion_id}
                          className="flex-1 ghrs-btn-danger text-xs py-2 justify-center"
                        >
                          <RejectIcon size={12} />{' '}
                          {processingId === event.completion_id ? 'جاري...' : 'رفض'}
                        </button>
                      </div>
                    )}

                    {event.approved === true && event.completion_id && (
                      <div className="mt-3">
                        <button
                          onClick={() => setRevokeConfirm(event)}
                          disabled={processingId === event.completion_id}
                          className="w-full ghrs-btn-secondary text-xs py-2 justify-center"
                          style={{ color: 'var(--ghrs-red-600)' }}
                        >
                          <RejectIcon size={12} /> سحب الاعتماد
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <EmptyState
              icon={<ClockIcon size={32} />}
              title="لا يوجد نشاط"
              description={
                searchQuery || filterCategory !== 'all'
                  ? 'لا توجد نتائج مطابقة للبحث'
                  : 'لم تُسجل أي عمليات بعد'
              }
            />
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  );
}
