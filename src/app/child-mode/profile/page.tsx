'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChildBottomNav } from '@/components/layout';
import { LEVELS, getLevel, getNextLevel, Level } from '@/lib/gamification';
import ThemeToggle from '@/components/child/ThemeToggle';
import ChildLoading from '@/components/child/ChildLoading';
import AchievementBadge from '@/components/child/AchievementBadge';
import {
  StarIcon,
  FireIcon,
  CheckIcon,
  TasksIcon,
  TrophyIcon,
  SparkleIcon,
  CoinIcon,
} from '@/components/icons';
import { getCurrentUser } from '@/lib/auth/helper';

export default function ChildProfilePage() {
  const [member, setMember] = useState<any>(null);
  const [xp, setXp] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const authUser = await getCurrentUser();
      if (!authUser || authUser.role !== 'child') {
        router.push('/family-login');
        return;
      }

      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'profile' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        router.push('/family-login');
        return;
      }

      setMember(result.member);
      setXp(result.xp);
      setTotalTasks(result.total_tasks);
      setCompletedTasks(result.completed_tasks);
      setStreak(result.member.current_streak || 0);
      setAchievements(result.achievements || []);
      setLoading(false);
    };

    getData();
  }, []);

  const level = getLevel(xp);
  const nextLevel = getNextLevel(level);
  const progressToNext = nextLevel
    ? Math.min(100, ((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)
    : 100;

  const handleLogout = () => {
    localStorage.removeItem('child_id');
    localStorage.removeItem('family_id');
    router.push('/family-login');
  };

  if (loading) {
    return <ChildLoading text="جاري تحميل الملف..." icon="👤" />;
  }

  // Achievements are now DB-driven from the API response
  // Compute progress based on requirement_type and current stats
  const achievementsWithProgress = achievements.map((a: any) => {
    let current = 0;
    switch (a.requirement_type) {
      case 'xp_total':
        current = xp;
        break;
      case 'tasks_completed':
        current = completedTasks;
        break;
      case 'streak':
      case 'streak_days':
        current = streak;
        break;
      default:
        current = 0;
    }
    return {
      ...a,
      progress: { current, max: a.requirement_value },
    };
  });

  const unlockedCount = achievementsWithProgress.filter((a: any) => a.unlocked).length;
  const totalAchievements = achievementsWithProgress.length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* === SECTION 1: Profile Header === */}
        <div className="mb-5">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--ghrs-surface-warm)',
                border: '1px solid var(--ghrs-border-default)',
              }}
            >
              <span className="text-2xl leading-none">{level.emoji}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className="text-2xl font-extrabold tracking-tight leading-tight"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                {member?.name}
              </h1>
              <p
                className="text-[13px] font-medium mt-0.5"
                style={{ color: 'var(--ghrs-text-secondary)' }}
              >
                المستوى {level.level} · {level.name}
              </p>
            </div>
          </div>
        </div>

        {/* === SECTION 2: Achievements (Primary) === */}
        <div
          className="mb-4 rounded-2xl p-5"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <TrophyIcon size={18} color="var(--ghrs-amber-600)" />
              <h2
                className="text-[15px] font-extrabold tracking-tight"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                إنجازاتي
              </h2>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums"
              style={{
                background: 'var(--ghrs-surface-pending)',
                color: 'var(--ghrs-amber-700)',
                border: '1px solid var(--ghrs-amber-200)',
              }}
            >
              {unlockedCount}/{totalAchievements}
            </span>
          </div>

          <div className="space-y-2">
            {achievementsWithProgress.map((achievement: any, i: number) => (
              <AchievementBadge
                key={i}
                title={achievement.title}
                description={achievement.description}
                icon={achievement.icon}
                unlocked={achievement.unlocked}
                progress={achievement.progress}
              />
            ))}
          </div>
        </div>

        {/* === SECTION 3: Level / Growth === */}
        <div
          className="mb-4 rounded-2xl p-5"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-base leading-none">{level.emoji}</span>
            <h2
              className="text-[15px] font-extrabold tracking-tight"
              style={{ color: 'var(--ghrs-text-primary)' }}
            >
              نمو حديقتي
            </h2>
          </div>

          {/* Current → Next */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--ghrs-bg-secondary)',
                  border: '1px solid var(--ghrs-border-default)',
                }}
              >
                <span className="text-xl leading-none">{level.emoji}</span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--ghrs-text-tertiary)' }}
                >
                  مستواك الآن
                </p>
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: 'var(--ghrs-text-primary)' }}
                >
                  {level.name}
                </p>
              </div>
            </div>

            {nextLevel && (
              <>
                <span
                  className="text-base leading-none px-1"
                  style={{ color: 'var(--ghrs-text-tertiary)', direction: 'ltr' }}
                >
                  ←
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 text-left">
                    <p
                      className="text-[10px] font-semibold"
                      style={{ color: 'var(--ghrs-text-tertiary)' }}
                    >
                      التالي
                    </p>
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: 'var(--ghrs-text-primary)' }}
                    >
                      {nextLevel.name}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'var(--ghrs-surface-success)',
                      border: '1px solid var(--ghrs-green-200)',
                    }}
                  >
                    <span className="text-xl leading-none">{nextLevel.emoji}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* XP Progress */}
          {nextLevel ? (
            <>
              <div className="ghrs-garden-xp-bar mb-2.5">
                <div className="ghrs-garden-xp-fill" style={{ width: `${progressToNext}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p
                  className="text-[11px] font-semibold tabular-nums"
                  style={{ color: 'var(--ghrs-text-secondary)' }}
                >
                  {xp} / {nextLevel.minXp} XP
                </p>
                <p
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: 'var(--ghrs-green-600)' }}
                >
                  باقي {nextLevel.minXp - xp} XP
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-1">
              <p className="text-[14px] font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                وصلت لأعلى مستوى
              </p>
            </div>
          )}
        </div>

        {/* === SECTION 4: Stats (Compact) === */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--ghrs-surface-pending)',
                border: '1px solid var(--ghrs-amber-200)',
              }}
            >
              <StarIcon size={14} color="var(--ghrs-amber-600)" />
            </div>
            <div className="min-w-0">
              <p
                className="text-base font-extrabold leading-tight tabular-nums"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                {xp}
              </p>
              <p
                className="text-[10px] font-semibold"
                style={{ color: 'var(--ghrs-text-tertiary)' }}
              >
                XP
              </p>
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--ghrs-surface-pending)',
                border: '1px solid var(--ghrs-amber-200)',
              }}
            >
              <FireIcon size={14} color="var(--ghrs-amber-600)" />
            </div>
            <div className="min-w-0">
              <p
                className="text-base font-extrabold leading-tight tabular-nums"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                {streak}
              </p>
              <p
                className="text-[10px] font-semibold"
                style={{ color: 'var(--ghrs-text-tertiary)' }}
              >
                أيام متتالية
              </p>
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--ghrs-surface-success)',
                border: '1px solid var(--ghrs-green-200)',
              }}
            >
              <CheckIcon size={14} color="var(--ghrs-green-600)" />
            </div>
            <div className="min-w-0">
              <p
                className="text-base font-extrabold leading-tight tabular-nums"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                {completedTasks}
              </p>
              <p
                className="text-[10px] font-semibold"
                style={{ color: 'var(--ghrs-text-tertiary)' }}
              >
                مهام مكتملة
              </p>
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--ghrs-blue-50)',
                border: '1px solid var(--ghrs-blue-200)',
              }}
            >
              <TasksIcon size={14} color="var(--ghrs-blue-600)" />
            </div>
            <div className="min-w-0">
              <p
                className="text-base font-extrabold leading-tight tabular-nums"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                {totalTasks}
              </p>
              <p
                className="text-[10px] font-semibold"
                style={{ color: 'var(--ghrs-text-tertiary)' }}
              >
                مهام نشطة
              </p>
            </div>
          </div>
        </div>

        {/* === Logout === */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-6 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
          style={{
            background: 'var(--ghrs-bg-secondary)',
            color: 'var(--ghrs-text-tertiary)',
            border: '1.5px solid var(--ghrs-border-default)',
          }}
        >
          خروج من الحساب
        </button>
      </div>

      <ChildBottomNav />
    </div>
  );
}
