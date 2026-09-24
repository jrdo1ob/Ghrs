'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChildBottomNav, EmptyState, Toast } from '@/components/layout';
import { useFamilyCurrency } from '@/hooks/useFamilyCurrency';
import RewardDetailsModal from '@/components/RewardDetailsModal';
import RequestDetailsModal from '@/components/RequestDetailsModal';
import ThemeToggle from '@/components/child/ThemeToggle';
import ChildLoading from '@/components/child/ChildLoading';
import { useSound } from '@/components/child/SoundManager';
import {
  GiftsIcon,
  StarIcon,
  CoinIcon,
  ClockIcon,
  LockIcon,
  CheckIcon,
  RejectIcon,
  SparkleIcon,
} from '@/components/icons';
import { getCurrentUser } from '@/lib/auth/helper';

export default function ChildGiftsPage() {
  const [gifts, setGifts] = useState<any[]>([]);
  const [redemptionRequests, setRedemptionRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [moneyBalance, setMoneyBalance] = useState(0);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
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
      const childId = authUser.memberId;
      setChildId(childId);

      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'gifts' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        router.push('/family-login');
        return;
      }

      setGifts(result.gifts);
      setRedemptionRequests(result.redemption_requests || []);
      setXp(result.xp);
      setMoneyBalance(result.money_balance);

      setLoading(false);
    };
    getData();
  }, []);

  const handleRedeem = async (giftId: string) => {
    const authUser = await getCurrentUser();
    if (!authUser || authUser.role !== 'child' || redeeming) return;

    const childId = authUser.memberId;
    setRedeeming(giftId);
    setShowGiftModal(false);

    try {
      const response = await fetch('/api/gifts/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gift_id: giftId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ' });
        play('error');
        return;
      }

      const refreshResponse = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'gifts' }),
      });
      const refreshResult = await refreshResponse.json();
      if (refreshResponse.ok && refreshResult.success) {
        setXp(refreshResult.xp);
        setMoneyBalance(refreshResult.money_balance);
      }

      play('gift');
      setToast({ type: 'success', message: 'تم طلب الهدية! انتظر موافقة الوالد' });
    } catch (err) {
      console.error('[GHRS] Gift redeem error:', err);
      setToast({ type: 'error', message: 'حدث خطأ أثناء طلب الهدية' });
      play('error');
    } finally {
      setRedeeming(null);
    }
  };

  const openGiftModal = (gift: any) => {
    setSelectedGift(gift);
    setShowGiftModal(true);
  };

  const openRequestModal = (req: any) => {
    setSelectedRequest(req);
    setShowRequestModal(true);
  };

  const openStatusModal = (status: string) => {
    setSelectedStatus(status);
    setShowStatusModal(true);
  };

  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; iconBg: string; icon: React.ReactNode }
  > = {
    pending: {
      label: 'قيد الانتظار',
      color: 'var(--ghrs-amber-700)',
      bg: 'var(--ghrs-amber-50)',
      iconBg: 'var(--ghrs-amber-100)',
      icon: <ClockIcon size={22} color="var(--ghrs-amber-600)" />,
    },
    rejected: {
      label: 'تم الرفض',
      color: 'var(--ghrs-red-600)',
      bg: 'var(--ghrs-red-50)',
      iconBg: 'var(--ghrs-red-100)',
      icon: <RejectIcon size={22} color="var(--ghrs-red-500)" />,
    },
    approved: {
      label: 'تمت الموافقة',
      color: 'var(--ghrs-green-600)',
      bg: 'var(--ghrs-green-50)',
      iconBg: 'var(--ghrs-green-100)',
      icon: <CheckIcon size={22} color="var(--ghrs-green-500)" />,
    },
    revoked: {
      label: 'تم سحب الموافقة',
      color: 'var(--ghrs-purple-600)',
      bg: 'var(--ghrs-purple-50)',
      iconBg: 'var(--ghrs-purple-100)',
      icon: <ClockIcon size={22} color="var(--ghrs-purple-500)" />,
    },
  };

  const groupedRequests = useMemo(() => {
    const groups: Record<string, typeof redemptionRequests> = {
      pending: [],
      rejected: [],
      revoked: [],
      approved: [],
    };
    for (const req of redemptionRequests) {
      if (groups[req.status]) groups[req.status].push(req);
    }
    return groups;
  }, [redemptionRequests]);

  if (loading) {
    return (
      <ChildLoading
        text="جاري تحميل الهدايا..."
        icon={<GiftsIcon size={48} color="var(--ghrs-purple-500)" />}
      />
    );
  }

  const totalPending = groupedRequests.pending.length;
  const totalApproved = groupedRequests.approved.length;
  const hasHistory =
    totalPending > 0 ||
    totalApproved > 0 ||
    groupedRequests.rejected.length > 0 ||
    groupedRequests.revoked.length > 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <RewardDetailsModal
        show={showGiftModal}
        gift={selectedGift}
        onClose={() => {
          setShowGiftModal(false);
          setSelectedGift(null);
        }}
        onRedeem={handleRedeem}
        childXp={xp}
        childMoney={moneyBalance}
        redeeming={redeeming}
        formatMoney={fmtMoney}
      />

      <RequestDetailsModal
        show={showRequestModal}
        request={selectedRequest}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedRequest(null);
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

        {/* === Header === */}
        <div className="mb-5">
          <h1
            className="text-2xl font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--ghrs-text-primary)' }}
          >
            مكافآتي
          </h1>
          <p
            className="text-[13px] font-medium mt-1"
            style={{ color: 'var(--ghrs-text-secondary)' }}
          >
            اجمع XP واطلب مكافآتك المفضلة
          </p>
        </div>

        {/* === Balance === */}
        <div
          className="mb-4 rounded-2xl p-4"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl flex-1"
              style={{
                background: 'var(--ghrs-surface-pending)',
                border: '1px solid var(--ghrs-amber-200)',
              }}
            >
              <StarIcon size={18} color="var(--ghrs-amber-600)" />
              <div>
                <p
                  className="text-lg font-extrabold leading-tight tabular-nums"
                  style={{ color: 'var(--ghrs-text-primary)' }}
                >
                  {xp}
                </p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--ghrs-amber-700)' }}>
                  XP
                </p>
              </div>
            </div>
            {moneyBalance > 0 && (
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl flex-1"
                style={{
                  background: 'var(--ghrs-surface-success)',
                  border: '1px solid var(--ghrs-green-200)',
                }}
              >
                <CoinIcon size={18} color="var(--ghrs-green-600)" />
                <div>
                  <p
                    className="text-lg font-extrabold leading-tight tabular-nums"
                    style={{ color: 'var(--ghrs-text-primary)' }}
                  >
                    {fmtMoney(moneyBalance)}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--ghrs-green-700)' }}>
                    د.ب
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === Reward Shop === */}
        {gifts.length === 0 ? (
          <div
            className="text-center py-14 rounded-2xl mb-6"
            style={{
              background: 'var(--ghrs-bg-card)',
              border: '1px solid var(--ghrs-border-default)',
              boxShadow: 'var(--ghrs-shadow-sm)',
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--ghrs-surface-purple)',
                border: '1px solid var(--ghrs-purple-200)',
              }}
            >
              <span className="text-3xl leading-none">🎁</span>
            </div>
            <p className="text-[15px] font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
              ما في مكافآت حالياً
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
              اجمع XP واستنى الوالد يضيف مكافآت
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 mb-1 px-1">
              <h2
                className="text-[15px] font-extrabold tracking-tight"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                المكافآت المتاحة
              </h2>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums"
                style={{
                  background: 'var(--ghrs-bg-secondary)',
                  color: 'var(--ghrs-text-secondary)',
                }}
              >
                {gifts.length}
              </span>
            </div>

            {gifts.map((gift) => {
              const canAfford = xp >= gift.cost_xp;
              const status = gift.redemption_status;
              const isPending = status === 'pending';
              const isApproved = status === 'approved';
              const isRejected = status === 'rejected';
              const isRevoked = status === 'revoked';
              const isBusy = redeeming === gift.id;

              return (
                <div
                  key={gift.id}
                  className="rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                  style={{
                    background: isApproved
                      ? 'var(--ghrs-surface-success)'
                      : isPending
                        ? 'var(--ghrs-surface-pending)'
                        : 'var(--ghrs-bg-card)',
                    border: `1px solid ${
                      isApproved
                        ? 'var(--ghrs-green-300)'
                        : isPending
                          ? 'var(--ghrs-amber-300)'
                          : isRejected
                            ? 'var(--ghrs-red-200)'
                            : canAfford
                              ? 'var(--ghrs-purple-300)'
                              : 'var(--ghrs-border-default)'
                    }`,
                    boxShadow: 'var(--ghrs-shadow-sm)',
                  }}
                >
                  {/* Gift header bar */}
                  <div
                    className="px-4 py-2 flex items-center justify-between"
                    style={{
                      background: 'var(--ghrs-bg-secondary)',
                      borderBottom: '1px solid var(--ghrs-border-default)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          color: isApproved
                            ? 'var(--ghrs-green-700)'
                            : isPending
                              ? 'var(--ghrs-amber-700)'
                              : isRejected
                                ? 'var(--ghrs-red-600)'
                                : canAfford
                                  ? 'var(--ghrs-purple-700)'
                                  : 'var(--ghrs-text-tertiary)',
                        }}
                      >
                        {isApproved
                          ? 'تمت الموافقة'
                          : isPending
                            ? 'بانتظار الوالد'
                            : isRejected
                              ? 'تم الرفض'
                              : isRevoked
                                ? 'تم السحب'
                                : canAfford
                                  ? 'تقدر تطلبها'
                                  : 'رصيدك ما يكفي'}
                      </span>
                    </div>
                    {/* Cost */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums"
                        style={{
                          background: 'var(--ghrs-bg-card)',
                          color: 'var(--ghrs-text-primary)',
                          border: '1px solid var(--ghrs-border-default)',
                        }}
                      >
                        <StarIcon size={10} color="var(--ghrs-amber-600)" /> {gift.cost_xp}
                      </span>
                      {gift.cost_money > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums"
                          style={{
                            background: 'var(--ghrs-bg-card)',
                            color: 'var(--ghrs-text-primary)',
                            border: '1px solid var(--ghrs-border-default)',
                          }}
                        >
                          <CoinIcon size={10} color="var(--ghrs-green-600)" />{' '}
                          {fmtMoney(gift.cost_money)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gift content */}
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'var(--ghrs-surface-purple)',
                          border: '1px solid var(--ghrs-purple-200)',
                        }}
                      >
                        <GiftsIcon size={20} color="var(--ghrs-purple-600)" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-[14px] font-bold leading-snug"
                          style={{ color: 'var(--ghrs-text-primary)' }}
                        >
                          {gift.title}
                        </h3>
                        {gift.description && (
                          <p
                            className="text-[12px] mt-1 line-clamp-2 leading-relaxed"
                            style={{ color: 'var(--ghrs-text-secondary)' }}
                          >
                            {gift.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {isPending ? (
                      <div
                        className="w-full py-3 rounded-xl text-center text-[13px] font-bold"
                        style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: 'var(--ghrs-amber-700)',
                        }}
                      >
                        بانتظار موافقة الوالد
                      </div>
                    ) : isApproved ? (
                      <div
                        className="w-full py-3 rounded-xl text-center text-[13px] font-bold"
                        style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: 'var(--ghrs-green-700)',
                        }}
                      >
                        تمت الموافقة — وصلت المكافأة
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRedeem(gift.id)}
                          disabled={!canAfford || isBusy}
                          className="flex-1 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97]"
                          style={{
                            background: canAfford
                              ? 'var(--ghrs-purple-600)'
                              : 'var(--ghrs-bg-secondary)',
                            color: canAfford ? 'white' : 'var(--ghrs-text-tertiary)',
                            opacity: isBusy ? 0.7 : 1,
                          }}
                        >
                          {isBusy ? 'جاري...' : canAfford ? 'اطلب المكافأة' : 'رصيد غير كافٍ'}
                        </button>
                        <button
                          onClick={() => openGiftModal(gift)}
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
        )}

        {/* === Request History (Secondary) === */}
        {hasHistory && (
          <>
            <h2
              className="text-[15px] font-extrabold tracking-tight mb-3 px-1"
              style={{ color: 'var(--ghrs-text-primary)' }}
            >
              طلباتي السابقة
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(['pending', 'rejected', 'approved', 'revoked'] as const).map((key) => {
                const sc = statusConfig[key];
                const count = groupedRequests[key].length;
                if (count === 0) return null;
                return (
                  <div
                    key={key}
                    onClick={() => openStatusModal(key)}
                    className="cursor-pointer active:scale-[0.97] transition-all rounded-2xl p-3.5 flex items-center gap-3"
                    style={{
                      background: 'var(--ghrs-bg-card)',
                      border: '1px solid var(--ghrs-border-default)',
                      boxShadow: 'var(--ghrs-shadow-sm)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: sc.iconBg }}
                    >
                      {sc.icon}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[10px] font-bold" style={{ color: sc.color }}>
                        {sc.label}
                      </span>
                      <span
                        className="text-lg font-bold leading-tight tabular-nums"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Status List Modal */}
        <AnimatePresence>
          {showStatusModal && selectedStatus && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => {
                setShowStatusModal(false);
                setSelectedStatus(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full md:max-w-sm max-h-[80vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
                style={{ background: 'var(--ghrs-bg-card)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="p-5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--ghrs-border-default)' }}
                >
                  <h3 className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                    طلبات {statusConfig[selectedStatus].label} (
                    {groupedRequests[selectedStatus].length})
                  </h3>
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setSelectedStatus(null);
                    }}
                    className="p-2 rounded-lg"
                    style={{
                      background: 'var(--ghrs-bg-tertiary)',
                      color: 'var(--ghrs-text-secondary)',
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {groupedRequests[selectedStatus].map((req: any) => (
                    <div
                      key={req.id}
                      onClick={() => {
                        setShowStatusModal(false);
                        setSelectedStatus(null);
                        openRequestModal(req);
                      }}
                      className="cursor-pointer active:scale-[0.97] transition-all rounded-xl p-3.5 flex items-center gap-3"
                      style={{
                        background: 'var(--ghrs-bg-secondary)',
                        border: '1px solid var(--ghrs-border-default)',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'var(--ghrs-purple-50)',
                          border: '1px solid var(--ghrs-purple-200)',
                        }}
                      >
                        <GiftsIcon size={16} color="var(--ghrs-purple-600)" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-bold truncate"
                          style={{ color: 'var(--ghrs-text-primary)' }}
                        >
                          {req.gift_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {req.requested_xp != null && (
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: 'var(--ghrs-amber-600)' }}
                            >
                              {req.requested_xp} XP
                            </span>
                          )}
                          {req.money_spent != null && req.money_spent > 0 && (
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: 'var(--ghrs-green-600)' }}
                            >
                              {fmtMoney(req.money_spent)}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ghrs-text-tertiary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0"
                        style={{ transform: 'scaleX(-1)' }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  ))}
                  {groupedRequests[selectedStatus].length === 0 && (
                    <p
                      className="text-center text-xs py-6"
                      style={{ color: 'var(--ghrs-text-tertiary)' }}
                    >
                      لا توجد طلبات
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChildBottomNav />
    </div>
  );
}
