'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChildBottomNav, Toast } from '@/components/layout';
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency';
import ParticleEffects from '@/components/ParticleEffects';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import TaskCompletionFeedback from '@/components/child/TaskCompletionFeedback';
import ThemeToggle from '@/components/child/ThemeToggle';
import ChildLoading from '@/components/child/ChildLoading';
import { useSound } from '@/components/child/SoundManager';
import {
  ClockIcon,
  StarIcon,
  CoinIcon,
  CheckIcon,
  QuranIcon,
  SparkleIcon,
  BookIcon,
  TasksIcon,
} from '@/components/icons';
import { getCurrentUser } from '@/lib/auth/helper';

export default function ChildTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [pendingToday, setPendingToday] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState<{
    taskName: string;
    xp: number;
    money: number;
    needsApproval: boolean;
  } | null>(null);
  const router = useRouter();
  const { format: fmtMoney } = useFamilyCurrency();
  const { play } = useSound();

  useEffect(() => {
    const getData = async () => {
      const authUser = await getCurrentUser();
      if (!authUser || authUser.role !== 'child') {
        router.push('/family-login');
        return;
      }
      const storedId = authUser.memberId;
      setChildId(storedId);

      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'tasks' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        router.push('/family-login');
        return;
      }

      setChildName(result.member.name);
      setTasks(result.tasks);
      setCompletedToday(result.completed_today);
      setPendingToday(result.pending_today);
      setLoading(false);
    };
    getData();
  }, []);

  const handleCompleteTask = async (taskId: string) => {
    if (!childId || completingTask) return;
    setCompletingTask(taskId);

    try {
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء إنجاز المهمة' });
        setCompletingTask(null);
        play('error');
        return;
      }

      const task = tasks.find((t) => t.id === taskId);
      const needsApproval = task?.requires_approval !== false;

      setPendingToday((prev) => [...prev, taskId]);
      setShowTaskModal(false);

      if (!needsApproval) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        play('complete');
      } else {
        play('click');
      }

      setCompletionFeedback({
        taskName: task?.title || '',
        xp: task?.xp_reward || 0,
        money: task?.money_reward || 0,
        needsApproval,
      });
      setShowCompletionFeedback(true);
    } catch (err) {
      console.error('[GHRS] Complete task error:', err);
      setToast({ type: 'error', message: 'حدث خطأ أثناء إنجاز المهمة' });
    } finally {
      setCompletingTask(null);
    }
  };

  const openTaskModal = (task: any) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const isCompletedToday = (taskId: string) => completedToday.includes(taskId);
  const isPendingToday = (taskId: string) => pendingToday.includes(taskId);

  if (loading) {
    return (
      <ChildLoading
        text="جاري تحميل المهام..."
        icon={<TasksIcon size={48} color="var(--ghrs-green-500)" />}
      />
    );
  }

  const completedCount = completedToday.length;
  const pendingCount = pendingToday.length;
  const availableTasks = tasks.filter((t) => !isCompletedToday(t.id) && !isPendingToday(t.id));

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ParticleEffects active={showConfetti} />

      <TaskDetailsModal
        show={showTaskModal}
        task={selectedTask}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
        isCompleted={selectedTask ? isCompletedToday(selectedTask.id) : false}
        isPending={selectedTask ? isPendingToday(selectedTask.id) : false}
        completingTask={completingTask}
        formatMoney={fmtMoney}
      />

      <TaskCompletionFeedback
        show={showCompletionFeedback}
        taskName={completionFeedback?.taskName || ''}
        xpEarned={completionFeedback?.xp || 0}
        moneyEarned={completionFeedback?.money || 0}
        needsApproval={completionFeedback?.needsApproval ?? true}
        onClose={() => {
          setShowCompletionFeedback(false);
          setCompletionFeedback(null);
        }}
        formatMoney={fmtMoney}
      />

      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="mb-5">
          <h1
            className="text-2xl font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--ghrs-text-primary)' }}
          >
            مهامي
          </h1>
          {childName && (
            <p
              className="text-[13px] font-medium mt-1"
              style={{ color: 'var(--ghrs-text-secondary)' }}
            >
              {availableTasks.length > 0
                ? `${availableTasks.length} مهام تنتظرك اليوم`
                : completedCount > 0
                  ? 'خلصت كل مهامك — ممتاز'
                  : 'ما في مهام اليوم، استرح وتمتّع بيومك'}
            </p>
          )}
        </div>

        {tasks.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--ghrs-surface-success)',
                border: '1px solid var(--ghrs-green-200)',
              }}
            >
              <span className="text-3xl leading-none">🌿</span>
            </div>
            <p className="text-[15px] font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
              ما في مهام
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
              استرح وتمتّع بيومك
            </p>
          </div>
        ) : (
          <>
            {/* Task summary */}
            <div
              className="mb-4 rounded-2xl p-4"
              style={{
                background: 'var(--ghrs-bg-card)',
                border: '1px solid var(--ghrs-border-default)',
                boxShadow: 'var(--ghrs-shadow-sm)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <CheckIcon size={14} color="var(--ghrs-green-600)" />
                    <span
                      className="text-[13px] font-bold tabular-nums"
                      style={{ color: 'var(--ghrs-green-600)' }}
                    >
                      {completedCount} مكتملة
                    </span>
                  </div>
                  <div
                    className="w-px h-3.5"
                    style={{ background: 'var(--ghrs-border-default)' }}
                  />
                  <div className="flex items-center gap-1.5">
                    <ClockIcon size={14} color="var(--ghrs-amber-600)" />
                    <span
                      className="text-[13px] font-bold tabular-nums"
                      style={{ color: 'var(--ghrs-amber-600)' }}
                    >
                      {pendingCount} بانتظار
                    </span>
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold tabular-nums"
                  style={{ color: 'var(--ghrs-text-tertiary)' }}
                >
                  {tasks.length} المجموع
                </span>
              </div>
              <div className="ghrs-garden-xp-bar" style={{ height: '6px' }}>
                <div
                  className="ghrs-garden-xp-fill"
                  style={{
                    width: `${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Task cards */}
            <div className="space-y-3">
              {tasks.map((task) => {
                const completed = isCompletedToday(task.id);
                const pending = isPendingToday(task.id);
                const isQuran = task.task_type === 'quran';
                const isDua = task.task_type === 'dua';
                const isBusy = completingTask === task.id;

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                    style={{
                      background: completed
                        ? 'var(--ghrs-surface-success)'
                        : pending
                          ? 'var(--ghrs-surface-pending)'
                          : 'var(--ghrs-bg-card)',
                      border: `1px solid ${
                        completed
                          ? 'var(--ghrs-green-200)'
                          : pending
                            ? 'var(--ghrs-amber-200)'
                            : 'var(--ghrs-border-default)'
                      }`,
                      boxShadow: 'var(--ghrs-shadow-sm)',
                      opacity: completed ? 0.7 : 1,
                    }}
                  >
                    <div className="p-4">
                      {/* Top: Title + Status */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: completed
                              ? 'var(--ghrs-green-100)'
                              : pending
                                ? 'var(--ghrs-amber-100)'
                                : 'var(--ghrs-bg-secondary)',
                            border: `1px solid ${
                              completed
                                ? 'var(--ghrs-green-200)'
                                : pending
                                  ? 'var(--ghrs-amber-200)'
                                  : 'var(--ghrs-border-default)'
                            }`,
                          }}
                        >
                          {completed ? (
                            <CheckIcon size={15} color="var(--ghrs-green-700)" />
                          ) : pending ? (
                            <ClockIcon size={15} color="var(--ghrs-amber-700)" />
                          ) : isQuran ? (
                            <QuranIcon size={15} color="var(--ghrs-green-600)" />
                          ) : isDua ? (
                            <SparkleIcon size={15} color="var(--ghrs-amber-600)" />
                          ) : (
                            <BookIcon size={15} color="var(--ghrs-text-tertiary)" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-[14px] font-bold leading-snug"
                            style={{
                              color: completed
                                ? 'var(--ghrs-green-700)'
                                : 'var(--ghrs-text-primary)',
                              textDecoration: completed ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p
                              className="text-[12px] leading-relaxed mt-1 line-clamp-2"
                              style={{ color: 'var(--ghrs-text-secondary)' }}
                            >
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rewards row */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl tabular-nums"
                          style={{
                            background: 'var(--ghrs-surface-pending)',
                            color: 'var(--ghrs-amber-700)',
                            border: '1px solid var(--ghrs-amber-200)',
                          }}
                        >
                          <StarIcon size={13} color="var(--ghrs-amber-600)" /> +{task.xp_reward} XP
                        </span>
                        {task.money_reward > 0 && (
                          <span
                            className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl tabular-nums"
                            style={{
                              background: 'var(--ghrs-surface-success)',
                              color: 'var(--ghrs-green-700)',
                              border: '1px solid var(--ghrs-green-200)',
                            }}
                          >
                            <CoinIcon size={13} color="var(--ghrs-green-600)" /> +
                            {fmtMoney(task.money_reward)} د.ب
                          </span>
                        )}
                        {isQuran && task.quran_action_type && (
                          <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                            style={{
                              background: 'var(--ghrs-bg-secondary)',
                              color: 'var(--ghrs-text-secondary)',
                              border: '1px solid var(--ghrs-border-default)',
                            }}
                          >
                            {task.quran_action_type === 'memorize' ? 'حفظ' : 'قراءة'}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      {completed ? (
                        <div
                          className="w-full py-3 rounded-xl text-center text-[13px] font-bold"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: 'var(--ghrs-green-700)',
                          }}
                        >
                          تم الإنجاز
                        </div>
                      ) : pending ? (
                        <div
                          className="w-full py-3 rounded-xl text-center text-[13px] font-bold"
                          style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: 'var(--ghrs-amber-700)',
                          }}
                        >
                          بانتظار موافقة الوالد
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={isBusy}
                            className="flex-1 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97]"
                            style={{
                              background: 'var(--ghrs-green-600)',
                              color: 'white',
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            {isBusy ? '...' : 'أنجز المهمة'}
                          </button>
                          <button
                            onClick={() => openTaskModal(task)}
                            className="px-4 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97]"
                            style={{
                              background: 'var(--ghrs-bg-secondary)',
                              color: 'var(--ghrs-text-secondary)',
                              border: '1px solid var(--ghrs-border-default)',
                            }}
                          >
                            التفاصيل
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ChildBottomNav />
    </div>
  );
}
