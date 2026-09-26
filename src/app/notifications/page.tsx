'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState } from '@/components/layout';
import { getCurrentUser, AuthUser } from '@/lib/auth/helper';
import { BellIcon, CheckIcon, GiftsIcon, TasksIcon, CoinIcon, StreakIcon, StarIcon } from '@/components/icons';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  sender_name: string | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  gift_request: <GiftsIcon size={16} color="var(--ghrs-amber-600)" />,
  gift_approved: <GiftsIcon size={16} color="var(--ghrs-green-600)" />,
  gift_rejected: <GiftsIcon size={16} color="var(--ghrs-red-600)" />,
  withdrawal_request: <CoinIcon size={16} color="var(--ghrs-green-600)" />,
  task_pending: <TasksIcon size={16} color="var(--ghrs-blue-600)" />,
  task_approved: <CheckIcon size={16} color="var(--ghrs-green-600)" />,
  task_rejected: <TasksIcon size={16} color="var(--ghrs-red-600)" />,
  streak_milestone: <StreakIcon size={16} color="var(--ghrs-amber-600)" />,
  daily_goal_reached: <StarIcon size={16} color="var(--ghrs-green-600)" />,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return date.toLocaleDateString('ar-BH');
}

export default function NotificationsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user || user.role === 'child') {
        router.push('/family-login');
        return;
      }
      setAuthUser(user);
      setLoading(false);
    };
    check();
  }, []);

  const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
    if (!authUser) return;
    setFetching(true);
    setError(null);

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pageNum }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'حدث خطأ');
        return;
      }

      if (append) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications || []);
      }
      setTotal(data.total || 0);
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setFetching(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser) fetchNotifications(1);
  }, [authUser, fetchNotifications]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch {
      // Silently fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Silently fail
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  const hasMore = notifications.length < total;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--ghrs-bg-primary)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <BellIcon size={40} color="var(--ghrs-green-500)" className="ghrs-animate-float" />
          <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
            جاري التحميل...
          </p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <PageHeader title="الإشعارات" subtitle={`${total} إشعار`} />
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: 'var(--ghrs-green-50)',
                  color: 'var(--ghrs-green-700)',
                  border: '1px solid var(--ghrs-green-200)',
                }}
              >
                <CheckIcon size={14} />
                قراءة الكل
              </button>
            )}
          </div>

          {error && (
            <div
              className="ghrs-card p-4 mb-5"
              style={{ border: '1px solid var(--ghrs-red-200)', background: 'var(--ghrs-red-50)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-red-700)' }}>
                {error}
              </p>
              <button
                onClick={() => fetchNotifications(1)}
                className="text-xs font-bold mt-2"
                style={{ color: 'var(--ghrs-red-600)' }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {fetching && notifications.length === 0 && (
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
              style={{ background: 'var(--ghrs-bg-secondary)' }}
            >
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--ghrs-green-600)', borderTopColor: 'transparent' }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--ghrs-text-secondary)' }}
              >
                جاري تحميل الإشعارات...
              </span>
            </div>
          )}

          {!fetching && notifications.length === 0 && (
            <EmptyState
              icon={<BellIcon size={32} />}
              title="لا توجد إشعارات"
              description="ستظهر الإشعارات الجديدة هنا"
            />
          )}

          {notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="ghrs-card p-4 cursor-pointer transition-all hover:shadow-sm"
                  style={{
                    background: notification.is_read
                      ? 'var(--ghrs-bg-card)'
                      : 'var(--ghrs-green-50)',
                    borderLeft: notification.is_read
                      ? '3px solid transparent'
                      : '3px solid var(--ghrs-green-500)',
                  }}
                  onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: notification.is_read
                          ? 'var(--ghrs-bg-secondary)'
                          : 'var(--ghrs-green-100)',
                      }}
                    >
                      {TYPE_ICONS[notification.type] || <BellIcon size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p
                          className="text-sm font-bold truncate"
                          style={{
                            color: 'var(--ghrs-text-primary)',
                            fontWeight: notification.is_read ? '600' : '800',
                          }}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: 'var(--ghrs-green-500)' }}
                          />
                        )}
                      </div>
                      {notification.body && (
                        <p
                          className="text-xs mb-1"
                          style={{ color: 'var(--ghrs-text-secondary)' }}
                        >
                          {notification.body}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px]"
                          style={{ color: 'var(--ghrs-text-tertiary)' }}
                        >
                          {timeAgo(notification.created_at)}
                        </span>
                        {notification.sender_name && (
                          <>
                            <span
                              className="text-[10px]"
                              style={{ color: 'var(--ghrs-text-tertiary)' }}
                            >
                              •
                            </span>
                            <span
                              className="text-[10px]"
                              style={{ color: 'var(--ghrs-text-tertiary)' }}
                            >
                              {notification.sender_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={fetching}
                  className="w-full py-3 text-xs font-bold rounded-lg transition-all"
                  style={{
                    background: 'var(--ghrs-bg-card)',
                    color: 'var(--ghrs-green-600)',
                    border: '1px solid var(--ghrs-border-default)',
                  }}
                >
                  {fetching ? 'جاري التحميل...' : 'تحميل المزيد'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  );
}
