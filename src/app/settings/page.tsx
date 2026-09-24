'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ParentBottomNav, ParentSidebar, PageHeader, Toast } from '@/components/layout';
import { useTheme } from '@/lib/theme/provider';
import { clearAuth, AuthUser } from '@/lib/auth/helper';
import { EditIcon } from '@/components/icons';

export default function SettingsPage() {
  const [member, setMember] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingMemberName, setEditingMemberName] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currencySaving, setCurrencySaving] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getData = async () => {
      // Member + family profile data is resolved server-side
      const response = await fetch('/api/settings/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        router.push('/owner-login');
        return;
      }

      if (!result.member) {
        router.push('/family-setup');
        return;
      }

      setMember(result.member);
      setFamily(result.family);
      setLoading(false);
    };

    getData();
  }, []);

  const handleUpdateName = async () => {
    setError('');
    if (!newName.trim()) {
      setError('الاسم لا يمكن أن يكون فارغاً');
      return;
    }

    // Updated server-side for the session family — family identity is derived
    // from the validated session, never trusted from the browser.
    const response = await fetch('/api/settings/update-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setError(result.error || 'حدث خطأ أثناء تعديل اسم العائلة');
      return;
    }

    setFamily(result.family);
    setEditing(false);
    setToast({ type: 'success', message: 'تم تعديل اسم العائلة!' });
  };

  const handleUpdateMemberName = async () => {
    setError('');
    if (!newMemberName.trim()) {
      setError('الاسم لا يمكن أن يكون فارغاً');
      return;
    }

    // Updated server-side for the session member — member identity is derived
    // from the validated session, never trusted from the browser.
    const response = await fetch('/api/settings/update-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setError(result.error || 'حدث خطأ أثناء تعديل الاسم');
      return;
    }

    setMember(result.member);
    setEditingMemberName(false);
    setToast({ type: 'success', message: 'تم تعديل اسمك!' });
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!family || currencySaving) return;
    setCurrencySaving(true);

    // Updated server-side for the session family
    const response = await fetch('/api/settings/update-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: newCurrency }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setToast({ type: 'error', message: result.error || 'حدث خطأ أثناء تعديل العملة' });
      setCurrencySaving(false);
      return;
    }

    setFamily(result.family);
    setCurrencySaving(false);
    setToast({ type: 'success', message: 'تم تعديل العملة!' });
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="ghrs-card p-6">
                <div className="space-y-4">
                  <div className="h-4 w-1/3 ghrs-skeleton rounded" />
                  <div className="h-10 w-full ghrs-skeleton rounded" />
                  <div className="h-4 w-1/2 ghrs-skeleton rounded" />
                </div>
              </div>
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

      <ParentSidebar />

      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <PageHeader title="الإعدادات" subtitle="إعدادات العائلة والحساب" backHref="/dashboard" />

          <div className="space-y-4">
            {/* Family Info */}
            <div className="ghrs-card p-5">
              <h2
                className="text-base font-bold mb-3"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                معلومات العائلة
              </h2>

              {error && (
                <div
                  className="mb-3 p-2.5 rounded-lg text-xs"
                  style={{
                    background: 'var(--ghrs-red-50)',
                    color: 'var(--ghrs-red-600)',
                    border: '1px solid var(--ghrs-red-200)',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="ghrs-label">اسم العائلة</p>
                  {editing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="ghrs-input flex-1"
                        placeholder="اسم جديد"
                      />
                      <button onClick={handleUpdateName} className="ghrs-btn-primary flex-shrink-0">
                        حفظ
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          setError('');
                        }}
                        className="ghrs-btn-secondary flex-shrink-0"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p
                        className="text-base font-bold flex-1 min-w-0 truncate"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {family?.name}
                      </p>
                      <button
                        onClick={() => {
                          setNewName(family?.name);
                          setEditing(true);
                        }}
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: 'var(--ghrs-text-secondary)' }}
                      >
                        <EditIcon size={12} /> تعديل
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="ghrs-label">كود العائلة</p>
                  <p
                    className="text-base font-bold font-mono tabular-nums"
                    style={{ color: 'var(--ghrs-text-primary)' }}
                  >
                    {family?.code}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                    شارك هذا الكود مع أفراد العائلة للدخول
                  </p>
                </div>

                <div>
                  <p className="ghrs-label">دورك</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                    {member?.role === 'owner'
                      ? 'مالك العائلة'
                      : member?.role === 'parent'
                        ? 'ولي الأمر'
                        : 'طفل'}
                  </p>
                </div>

                <div>
                  <p className="ghrs-label">اسمك</p>
                  {editingMemberName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="ghrs-input flex-1"
                        placeholder="اسم جديد"
                      />
                      <button
                        onClick={handleUpdateMemberName}
                        className="ghrs-btn-primary flex-shrink-0"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => {
                          setEditingMemberName(false);
                          setError('');
                        }}
                        className="ghrs-btn-secondary flex-shrink-0"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p
                        className="text-base font-bold flex-1 min-w-0 truncate"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {member?.name}
                      </p>
                      <button
                        onClick={() => {
                          setNewMemberName(member?.name);
                          setEditingMemberName(true);
                        }}
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: 'var(--ghrs-text-secondary)' }}
                      >
                        <EditIcon size={12} /> تعديل
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Currency Settings */}
            <div className="ghrs-card p-5">
              <h2
                className="text-base font-bold mb-3"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                العملة
              </h2>
              <p className="text-xs mb-3" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                اختر عملة العائلة لعرض المكافآت المالية
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'KWD', name: 'الدينار الكويتي', symbol: 'د.ك' },
                  { code: 'SAR', name: 'الريال السعودي', symbol: 'ر.س' },
                  { code: 'AED', name: 'الدرهم الإماراتي', symbol: 'د.إ' },
                  { code: 'QAR', name: 'الريال القطري', symbol: 'ر.ق' },
                  { code: 'BHD', name: 'الدينار البحريني', symbol: 'د.ب' },
                  { code: 'OMR', name: 'الريال العماني', symbol: 'ر.ع' },
                ].map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => handleCurrencyChange(currency.code)}
                    disabled={currencySaving}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all"
                    style={{
                      background:
                        family?.currency === currency.code
                          ? 'var(--ghrs-green-50)'
                          : 'var(--ghrs-bg-secondary)',
                      border: `1px solid ${family?.currency === currency.code ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}`,
                      color:
                        family?.currency === currency.code
                          ? 'var(--ghrs-green-700)'
                          : 'var(--ghrs-text-secondary)',
                      opacity: currencySaving ? 0.7 : 1,
                    }}
                  >
                    <span className="text-base font-bold">{currency.symbol}</span>
                    <span className="text-[10px] font-semibold">{currency.code}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="ghrs-card p-5">
              <h2
                className="text-base font-bold mb-3"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                المظهر
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light' as const, label: 'فاتح', icon: '☀️' },
                  { value: 'dark' as const, label: 'داكن', icon: '🌙' },
                  { value: 'system' as const, label: 'النظام', icon: '💻' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all"
                    style={{
                      background:
                        theme === option.value
                          ? 'var(--ghrs-green-50)'
                          : 'var(--ghrs-bg-secondary)',
                      border: `1px solid ${theme === option.value ? 'var(--ghrs-green-300)' : 'var(--ghrs-border-default)'}`,
                      color:
                        theme === option.value
                          ? 'var(--ghrs-green-700)'
                          : 'var(--ghrs-text-secondary)',
                    }}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <span className="text-xs font-bold">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account */}
            <div className="ghrs-card p-5">
              <h2
                className="text-base font-bold mb-3"
                style={{ color: 'var(--ghrs-text-primary)' }}
              >
                الحساب
              </h2>
              <button
                onClick={async () => {
                  clearAuth();
                  await supabase.auth.signOut();
                  router.push('/');
                }}
                className="ghrs-btn-danger w-full justify-center"
              >
                خروج من الحساب
              </button>
            </div>
          </div>
        </div>
      </div>

      <ParentBottomNav />
    </div>
  );
}
