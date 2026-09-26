'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState } from '@/components/layout';
import { getCurrentUser, AuthUser } from '@/lib/auth/helper';
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency';
import {
  XPIcon,
  CoinIcon,
  TasksIcon,
  CheckIcon,
  StreakIcon,
  StarIcon,
  ChildIcon,
  LeafIcon,
} from '@/components/icons';

type Granularity = 'day' | 'week';
type RangeKey = '7' | '30' | '90';
type SortKey = 'xp_earned' | 'money_earned' | 'tasks_completed' | 'tasks_approved';
type SortDir = 'asc' | 'desc';

interface TrendBucket {
  bucket: string;
  xp_earned: number;
  xp_deductions: number;
  money_earned: number;
  tasks_completed: number;
  tasks_approved: number;
}

interface ChildTrend {
  childId: string;
  name: string;
  trends: TrendBucket[];
}

interface SummaryChild {
  childId: string;
  name: string;
  xp_earned: number;
  money_earned: number;
  tasks_completed: number;
  tasks_approved: number;
  current_streak: number;
  longest_streak: number;
}

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number; granularity: Granularity }[] = [
  { key: '7', label: 'آخر 7 أيام', days: 7, granularity: 'day' },
  { key: '30', label: 'آخر 30 يوم', days: 30, granularity: 'day' },
  { key: '90', label: 'آخر 90 يوم', days: 90, granularity: 'week' },
];

function getDateRange(days: number): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ background: 'var(--ghrs-bg-secondary)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rangeKey, setRangeKey] = useState<RangeKey>('30');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [compareSortKey, setCompareSortKey] = useState<SortKey>('xp_earned');
  const [compareSortDir, setCompareSortDir] = useState<SortDir>('desc');

  const [summaryChildren, setSummaryChildren] = useState<SummaryChild[]>([]);
  const [trendChildren, setTrendChildren] = useState<ChildTrend[]>([]);
  const [fetching, setFetching] = useState(false);

  const router = useRouter();
  const { format: fmtMoney } = useFamilyCurrency();

  const selectedRange = RANGE_OPTIONS.find((r) => r.key === rangeKey)!;

  // Auth check
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

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    if (!authUser) return;
    setFetching(true);
    setError(null);

    try {
      const { from, to } = getDateRange(selectedRange.days);
      const body = { from, to, childId: selectedChildId || undefined };

      const [summaryRes, trendsRes] = await Promise.all([
        fetch('/api/analytics/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        fetch('/api/analytics/trends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, granularity: selectedRange.granularity }),
        }),
      ]);

      const summaryData = await summaryRes.json();
      const trendsData = await trendsRes.json();

      if (!summaryRes.ok || !summaryData.success) {
        setError(summaryData.error || 'حدث خطأ في تحميل الملخص');
        return;
      }
      if (!trendsRes.ok || !trendsData.success) {
        setError(trendsData.error || 'حدث خطأ في تحميل الاتجاهات');
        return;
      }

      setSummaryChildren(summaryData.children || []);
      setTrendChildren(trendsData.children || []);
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setFetching(false);
    }
  }, [authUser, rangeKey, selectedChildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate family totals from summary
  const familyTotals = summaryChildren.reduce(
    (acc, c) => ({
      xp: acc.xp + (c.xp_earned || 0),
      money: acc.money + (c.money_earned || 0),
      completed: acc.completed + (c.tasks_completed || 0),
      approved: acc.approved + (c.tasks_approved || 0),
    }),
    { xp: 0, money: 0, completed: 0, approved: 0 }
  );

  // Find max values for bar scaling across all trends
  const allTrends = trendChildren.flatMap((c) => c.trends);
  const maxXp = Math.max(...allTrends.map((t) => t.xp_earned), 1);
  const maxMoney = Math.max(...allTrends.map((t) => t.money_earned), 1);
  const maxCompleted = Math.max(...allTrends.map((t) => t.tasks_completed), 1);
  const maxApproved = Math.max(...allTrends.map((t) => t.tasks_approved), 1);

  // Child snapshot (selected child or first child)
  const snapshotChild = selectedChildId
    ? summaryChildren.find((c) => c.childId === selectedChildId)
    : summaryChildren[0];
  const snapshotTrends = selectedChildId
    ? trendChildren.find((c) => c.childId === selectedChildId)
    : trendChildren[0];

  // Use canonical DB streak values (maintained by update_member_streak RPC, requires 100% task completion)
  // DG2 fix: replaced incorrect client-side any-activity computation with authoritative DB values
  const streak = snapshotChild
    ? { current: snapshotChild.current_streak || 0, longest: snapshotChild.longest_streak || 0 }
    : { current: 0, longest: 0 };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--ghrs-bg-primary)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <LeafIcon size={40} color="var(--ghrs-green-500)" className="ghrs-animate-float" />
          <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
            جاري التحميل...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <ParentSidebar />
      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <PageHeader title="تحليلات العائلة" subtitle="نظرة شاملة على تقدم الأبناء" />

          {/* Date Range Selector */}
          <div className="flex gap-2 mb-5 overflow-x-auto">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRangeKey(opt.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background: rangeKey === opt.key ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-card)',
                  color:
                    rangeKey === opt.key ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)',
                  border: `1px solid ${rangeKey === opt.key ? 'var(--ghrs-green-200)' : 'var(--ghrs-border-default)'}`,
                }}
                aria-pressed={rangeKey === opt.key}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Child Selection */}
          {summaryChildren.length > 1 && (
            <div className="flex gap-2 mb-5 overflow-x-auto">
              <button
                onClick={() => setSelectedChildId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5"
                style={{
                  background: !selectedChildId ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-card)',
                  color: !selectedChildId ? 'var(--ghrs-green-700)' : 'var(--ghrs-text-secondary)',
                  border: `1px solid ${!selectedChildId ? 'var(--ghrs-green-200)' : 'var(--ghrs-border-default)'}`,
                }}
                aria-pressed={!selectedChildId}
              >
                <ChildIcon size={14} />
                جميع الأبناء
              </button>
              {summaryChildren.map((c) => (
                <button
                  key={c.childId}
                  onClick={() => setSelectedChildId(c.childId)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5"
                  style={{
                    background:
                      selectedChildId === c.childId
                        ? 'var(--ghrs-green-50)'
                        : 'var(--ghrs-bg-card)',
                    color:
                      selectedChildId === c.childId
                        ? 'var(--ghrs-green-700)'
                        : 'var(--ghrs-text-secondary)',
                    border: `1px solid ${selectedChildId === c.childId ? 'var(--ghrs-green-200)' : 'var(--ghrs-border-default)'}`,
                  }}
                  aria-pressed={selectedChildId === c.childId}
                >
                  <ChildIcon size={14} />
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              className="ghrs-card p-4 mb-5"
              style={{ border: '1px solid var(--ghrs-red-200)', background: 'var(--ghrs-red-50)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-red-700)' }}>
                {error}
              </p>
              <button
                onClick={fetchData}
                className="text-xs font-bold mt-2"
                style={{ color: 'var(--ghrs-red-600)' }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Loading overlay */}
          {fetching && (
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
                جاري تحديث البيانات...
              </span>
            </div>
          )}

          {/* No Children State */}
          {!fetching && !error && summaryChildren.length === 0 && (
            <EmptyState
              icon={<ChildIcon size={32} />}
              title="لا توجد بيانات بعد"
              description="لم يتم العثور على أبناء في العائلة"
            />
          )}

          {summaryChildren.length > 0 && (
            <>
              {/* Family Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="ghrs-card p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--ghrs-amber-50)' }}
                    >
                      <StarIcon size={20} color="var(--ghrs-amber-600)" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-xl font-bold tabular-nums leading-none"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {familyTotals.xp}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        نقاط XP
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ghrs-card p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--ghrs-green-50)' }}
                    >
                      <CoinIcon size={20} color="var(--ghrs-green-600)" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-xl font-bold tabular-nums leading-none truncate"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {fmtMoney(familyTotals.money)}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        الأموال
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ghrs-card p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--ghrs-bg-secondary)' }}
                    >
                      <TasksIcon size={20} color="var(--ghrs-text-secondary)" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-xl font-bold tabular-nums leading-none"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {familyTotals.completed}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        مهام مكتملة
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ghrs-card p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--ghrs-green-50)' }}
                    >
                      <CheckIcon size={20} color="var(--ghrs-green-600)" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-xl font-bold tabular-nums leading-none"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {familyTotals.approved}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        مهام معتمدة
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Child Snapshot */}
              {snapshotChild && (
                <div className="ghrs-card p-4 mb-6">
                  <h2
                    className="text-sm font-bold mb-3"
                    style={{ color: 'var(--ghrs-text-primary)' }}
                  >
                    {selectedChildId ? snapshotChild.name : snapshotChild.name}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: 'var(--ghrs-amber-50)',
                        border: '1px solid var(--ghrs-amber-200)',
                      }}
                    >
                      <StreakIcon size={16} color="var(--ghrs-amber-600)" />
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                          السلسلة الحالية
                        </p>
                        <p
                          className="text-sm font-extrabold tabular-nums leading-none"
                          style={{ color: 'var(--ghrs-text-primary)' }}
                        >
                          {streak.current} يوم
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: 'var(--ghrs-bg-secondary)',
                        border: '1px solid var(--ghrs-border-default)',
                      }}
                    >
                      <StreakIcon size={16} color="var(--ghrs-text-secondary)" />
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                          أطول سلسلة
                        </p>
                        <p
                          className="text-sm font-extrabold tabular-nums leading-none"
                          style={{ color: 'var(--ghrs-text-primary)' }}
                        >
                          {streak.longest} يوم
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: 'var(--ghrs-surface-success)',
                        border: '1px solid var(--ghrs-green-200)',
                      }}
                    >
                      <StarIcon size={16} color="var(--ghrs-green-600)" />
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                          XP الفترة
                        </p>
                        <p
                          className="text-sm font-extrabold tabular-nums leading-none"
                          style={{ color: 'var(--ghrs-text-primary)' }}
                        >
                          {snapshotChild.xp_earned}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: 'var(--ghrs-surface-success)',
                        border: '1px solid var(--ghrs-green-200)',
                      }}
                    >
                      <CoinIcon size={16} color="var(--ghrs-green-600)" />
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                          الأموال الفترة
                        </p>
                        <p
                          className="text-sm font-extrabold tabular-nums leading-none truncate"
                          style={{ color: 'var(--ghrs-text-primary)' }}
                        >
                          {fmtMoney(snapshotChild.money_earned)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Child Progress Comparison */}
              {summaryChildren.length > 1 && (
                <div className="ghrs-card p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2
                      className="text-sm font-bold"
                      style={{ color: 'var(--ghrs-text-primary)' }}
                    >
                      مقارنة التقدم
                    </h2>
                    <div className="flex gap-1">
                      {([
                        { key: 'xp_earned' as SortKey, label: 'XP' },
                        { key: 'money_earned' as SortKey, label: 'الأموال' },
                        { key: 'tasks_completed' as SortKey, label: 'المهام' },
                        { key: 'tasks_approved' as SortKey, label: 'المعتمدة' },
                      ]).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            if (compareSortKey === opt.key) {
                              setCompareSortDir(compareSortDir === 'desc' ? 'asc' : 'desc');
                            } else {
                              setCompareSortKey(opt.key);
                              setCompareSortDir('desc');
                            }
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold transition-all"
                          style={{
                            background:
                              compareSortKey === opt.key
                                ? 'var(--ghrs-green-50)'
                                : 'var(--ghrs-bg-secondary)',
                            color:
                              compareSortKey === opt.key
                                ? 'var(--ghrs-green-700)'
                                : 'var(--ghrs-text-tertiary)',
                            border: `1px solid ${compareSortKey === opt.key ? 'var(--ghrs-green-200)' : 'transparent'}`,
                          }}
                          aria-pressed={compareSortKey === opt.key}
                        >
                          {opt.label}
                          {compareSortKey === opt.key && (
                            <span className="mr-0.5">{compareSortDir === 'desc' ? '↓' : '↑'}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="space-y-3">
                      {[...summaryChildren]
                        .sort((a, b) => {
                          const diff = (a[compareSortKey] || 0) - (b[compareSortKey] || 0);
                          return compareSortDir === 'desc' ? -diff : diff;
                        })
                        .map((child, idx) => {
                          const maxVal = Math.max(
                            ...summaryChildren.map((c) => c[compareSortKey] || 0),
                            1
                          );
                          const pct = maxVal > 0 ? ((child[compareSortKey] || 0) / maxVal) * 100 : 0;
                          const barColors: Record<SortKey, string> = {
                            xp_earned: 'var(--ghrs-amber-500)',
                            money_earned: 'var(--ghrs-green-500)',
                            tasks_completed: 'var(--ghrs-blue-500)',
                            tasks_approved: 'var(--ghrs-green-600)',
                          };

                          return (
                            <div key={child.childId} className="flex items-center gap-3">
                              <span
                                className="text-[10px] font-bold w-4 text-center tabular-nums"
                                style={{ color: 'var(--ghrs-text-tertiary)' }}
                              >
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span
                                    className="text-xs font-bold truncate"
                                    style={{ color: 'var(--ghrs-text-primary)' }}
                                  >
                                    {child.name}
                                  </span>
                                  <span
                                    className="text-xs font-extrabold tabular-nums ml-2 flex-shrink-0"
                                    style={{ color: 'var(--ghrs-text-primary)' }}
                                  >
                                    {compareSortKey === 'money_earned'
                                      ? fmtMoney(child[compareSortKey] || 0)
                                      : child[compareSortKey] || 0}
                                  </span>
                                </div>
                                <div
                                  className="w-full h-2 rounded-full overflow-hidden"
                                  style={{ background: 'var(--ghrs-bg-secondary)' }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.max(pct, child[compareSortKey] > 0 ? 4 : 0)}%`,
                                      background: barColors[compareSortKey],
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Trends Visualizations */}
              {trendChildren.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                    اتجاهات الفترة
                  </h2>

                  {trendChildren.map((child) => {
                    const trends = child.trends;
                    const hasData = trends.some(
                      (t) => t.xp_earned > 0 || t.money_earned > 0 || t.tasks_completed > 0
                    );

                    if (!hasData) {
                      return (
                        <div key={child.childId} className="ghrs-card p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ChildIcon size={16} color="var(--ghrs-green-600)" />
                            <p
                              className="text-sm font-bold"
                              style={{ color: 'var(--ghrs-text-primary)' }}
                            >
                              {child.name}
                            </p>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                            لا توجد نشاطات في هذه الفترة
                          </p>
                        </div>
                      );
                    }

                    // Aggregate child totals for this period
                    const childTotal = trends.reduce(
                      (acc, t) => ({
                        xp: acc.xp + t.xp_earned,
                        money: acc.money + t.money_earned,
                        completed: acc.completed + t.tasks_completed,
                        approved: acc.approved + t.tasks_approved,
                      }),
                      { xp: 0, money: 0, completed: 0, approved: 0 }
                    );

                    return (
                      <div key={child.childId} className="ghrs-card p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <ChildIcon size={16} color="var(--ghrs-green-600)" />
                          <p
                            className="text-sm font-bold"
                            style={{ color: 'var(--ghrs-text-primary)' }}
                          >
                            {child.name}
                          </p>
                        </div>

                        {/* Metric rows */}
                        <div className="space-y-3">
                          {/* XP Earned */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <StarIcon size={12} color="var(--ghrs-amber-600)" />
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: 'var(--ghrs-text-secondary)' }}
                                >
                                  نقاط XP
                                </span>
                              </div>
                              <span
                                className="text-xs font-bold tabular-nums"
                                style={{ color: 'var(--ghrs-text-primary)' }}
                              >
                                {childTotal.xp}
                              </span>
                            </div>
                            <MetricBar
                              value={childTotal.xp}
                              max={Math.max(...trends.map((t) => t.xp_earned), 1)}
                              color="var(--ghrs-amber-500)"
                            />
                          </div>

                          {/* Money Earned */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <CoinIcon size={12} color="var(--ghrs-green-600)" />
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: 'var(--ghrs-text-secondary)' }}
                                >
                                  الأموال
                                </span>
                              </div>
                              <span
                                className="text-xs font-bold tabular-nums"
                                style={{ color: 'var(--ghrs-text-primary)' }}
                              >
                                {fmtMoney(childTotal.money)}
                              </span>
                            </div>
                            <MetricBar
                              value={childTotal.money}
                              max={Math.max(...trends.map((t) => t.money_earned), 1)}
                              color="var(--ghrs-green-500)"
                            />
                          </div>

                          {/* Tasks Completed */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <TasksIcon size={12} color="var(--ghrs-text-secondary)" />
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: 'var(--ghrs-text-secondary)' }}
                                >
                                  مهام مكتملة
                                </span>
                              </div>
                              <span
                                className="text-xs font-bold tabular-nums"
                                style={{ color: 'var(--ghrs-text-primary)' }}
                              >
                                {childTotal.completed}
                              </span>
                            </div>
                            <MetricBar
                              value={childTotal.completed}
                              max={Math.max(...trends.map((t) => t.tasks_completed), 1)}
                              color="var(--ghrs-blue-500)"
                            />
                          </div>

                          {/* Tasks Approved */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <CheckIcon size={12} color="var(--ghrs-green-600)" />
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: 'var(--ghrs-text-secondary)' }}
                                >
                                  مهام معتمدة
                                </span>
                              </div>
                              <span
                                className="text-xs font-bold tabular-nums"
                                style={{ color: 'var(--ghrs-text-primary)' }}
                              >
                                {childTotal.approved}
                              </span>
                            </div>
                            <MetricBar
                              value={childTotal.approved}
                              max={Math.max(...trends.map((t) => t.tasks_approved), 1)}
                              color="var(--ghrs-green-600)"
                            />
                          </div>
                        </div>

                        {/* Compact bucket rows */}
                        <div
                          className="mt-4 border-t pt-3"
                          style={{ borderColor: 'var(--ghrs-border-default)' }}
                        >
                          <p
                            className="text-[10px] font-bold uppercase tracking-wider mb-2"
                            style={{ color: 'var(--ghrs-text-tertiary)' }}
                          >
                            {selectedRange.granularity === 'day'
                              ? 'التفاصيل اليومية'
                              : 'التفاصيل الأسبوعية'}
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {trends.map((t) => {
                              const hasAny =
                                t.xp_earned > 0 || t.money_earned > 0 || t.tasks_completed > 0;
                              return (
                                <div
                                  key={t.bucket}
                                  className="flex items-center gap-2 px-2 py-1 rounded text-[11px]"
                                  style={{
                                    background: hasAny ? 'var(--ghrs-bg-secondary)' : 'transparent',
                                    color: 'var(--ghrs-text-secondary)',
                                  }}
                                >
                                  <span
                                    className="font-mono tabular-nums w-20 text-center"
                                    style={{ direction: 'ltr' }}
                                  >
                                    {t.bucket}
                                  </span>
                                  <span className="flex-1 text-left" style={{ direction: 'ltr' }}>
                                    {t.xp_earned > 0 && (
                                      <span className="ml-2">⭐{t.xp_earned}</span>
                                    )}
                                    {t.money_earned > 0 && (
                                      <span className="ml-2">💰{t.money_earned.toFixed(3)}</span>
                                    )}
                                    {t.tasks_completed > 0 && (
                                      <span className="ml-2">✅{t.tasks_completed}</span>
                                    )}
                                    {!hasAny && (
                                      <span style={{ color: 'var(--ghrs-text-tertiary)' }}>—</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty activity for all children */}
              {trendChildren.length > 0 &&
                !trendChildren.some((c) =>
                  c.trends.some(
                    (t) => t.xp_earned > 0 || t.money_earned > 0 || t.tasks_completed > 0
                  )
                ) && (
                  <div className="ghrs-card p-8 text-center mb-6">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--ghrs-text-tertiary)' }}
                    >
                      لا توجد نشاطات في الفترة المحددة
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
      <ParentBottomNav />
    </div>
  );
}
