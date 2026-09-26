'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellIcon } from '@/components/icons';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.count || 0);
      }
    } catch {
      // Silently fail — badge will show 0
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchCount]);

  const isActive = pathname === '/notifications';

  return (
    <Link
      href="/notifications"
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
        isActive
          ? 'text-ghrs-green-700 bg-ghrs-green-50'
          : 'text-ghrs-text-tertiary hover:text-ghrs-green-600'
      } ${className}`}
      aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} جديدة)` : ''}`}
    >
      <span className="relative">
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
            style={{ background: 'var(--ghrs-red-500)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </span>
      <span>الإشعارات</span>
    </Link>
  );
}
