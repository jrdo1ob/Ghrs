'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ParentBottomNav, ParentSidebar, PageHeader, EmptyState, Toast, Skeleton } from '@/components/layout'
import { getCurrentUser, clearAuth, AuthUser } from '@/lib/auth/helper'

const SURAHS = [
  { number: 1, name: 'الفاتحة', ayahs: 7 },
  { number: 2, name: 'البقرة', ayahs: 286 },
  { number: 3, name: 'آل عمران', ayahs: 200 },
  { number: 4, name: 'النساء', ayahs: 176 },
  { number: 5, name: 'المائدة', ayahs: 120 },
  { number: 6, name: 'الأنعام', ayahs: 165 },
  { number: 7, name: 'الأعراف', ayahs: 206 },
  { number: 8, name: 'الأنفال', ayahs: 75 },
  { number: 9, name: 'التوبة', ayahs: 129 },
  { number: 10, name: 'يونس', ayahs: 109 },
]

export default function QuranPage() {
  const [progress, setProgress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [selectedAyah, setSelectedAyah] = useState<number>(1)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getProgress = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/owner-login')
        return
      }

      const { data: progressData } = await supabase
        .from('quran_progress')
        .select('*')
        .eq('member_id', user.memberId)

      setProgress(progressData || [])
      setLoading(false)
    }

    getProgress()
  }, [])

  const handleAddProgress = async () => {
    if (!selectedSurah) return

    const user = await getCurrentUser()
    if (!user) return

    const { error } = await supabase
      .from('quran_progress')
      .insert({
        member_id: user.memberId,
        surah: selectedSurah,
        ayah: selectedAyah,
        completed_at: new Date().toISOString(),
      })

    if (error) {
      setToast({ type: 'error', message: 'حدث خطأ أثناء إضافة التقدم' })
      return
    }

    setProgress([...progress, {
      surah: selectedSurah,
      ayah: selectedAyah,
      completed_at: new Date().toISOString(),
    }])
    setSelectedSurah(null)
    setSelectedAyah(1)
    setToast({ type: 'success', message: 'تم إضافة التقدم بنجاح!' })
  }

  const getSurahProgress = (surahNumber: number) => {
    return progress.filter(p => p.surah === surahNumber).length
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
        <ParentSidebar />
        <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </div>
        <ParentBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {toast && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      <ParentSidebar />

      <div className="md:mr-[var(--ghrs-sidebar-width)] pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PageHeader 
            title="القرآن"
            subtitle="تتبع تقدم الحفظ"
            backHref="/dashboard"
          />

          {/* Add Progress Form */}
          <div className="ghrs-card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>إضافة تقدم جديد</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>السورة</label>
                <select
                  value={selectedSurah || ''}
                  onChange={(e) => setSelectedSurah(parseInt(e.target.value))}
                  className="ghrs-input"
                >
                  <option value="">اختر السورة</option>
                  {SURAHS.map(surah => (
                    <option key={surah.number} value={surah.number}>
                      {surah.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ghrs-text-secondary)' }}>الآية</label>
                <input
                  type="number"
                  value={selectedAyah}
                  onChange={(e) => setSelectedAyah(parseInt(e.target.value))}
                  min="1"
                  className="ghrs-input"
                />
              </div>
            </div>
            <button
              onClick={handleAddProgress}
              disabled={!selectedSurah}
              className="ghrs-btn-primary disabled:opacity-50"
            >
              إضافة
            </button>
          </div>

          {/* Surahs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SURAHS.map(surah => {
              const surahProgress = getSurahProgress(surah.number)
              const percentage = Math.min(100, Math.round((surahProgress / surah.ayahs) * 100))
              return (
                <div key={surah.number} className="ghrs-card p-4">
                  <h3 className="font-bold mb-1" style={{ color: 'var(--ghrs-text-primary)' }}>{surah.name}</h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--ghrs-text-secondary)' }}>{surah.ayahs} آية</p>
                  <div className="ghrs-progress-bar mb-2">
                    <div
                      className="ghrs-progress-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold" style={{ color: 'var(--ghrs-green-600)' }}>{percentage}%</p>
                    <p className="text-xs" style={{ color: 'var(--ghrs-text-tertiary)' }}>{surahProgress}/{surah.ayahs}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ParentBottomNav />
    </div>
  )
}
