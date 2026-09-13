'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChildBottomNav } from '@/components/layout'
import { LEVELS, getLevel, getNextLevel } from '@/lib/gamification'
import ThemeToggle from '@/components/child/ThemeToggle'
import ChildLoading from '@/components/child/ChildLoading'
import {
  GardenIcon,
  WaterIcon,
  SparkleIcon,
  FireIcon,
  TrophyIcon,
  ShieldIcon,
  CheckIcon,
  LockIcon,
} from '@/components/icons'
import { getCurrentUser } from '@/lib/auth/helper'

export default function ChildGardenPage() {
  const [xp, setXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [showAllStages, setShowAllStages] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const authUser = await getCurrentUser()
      if (!authUser || authUser.role !== 'child') {
        router.push('/family-login')
        return
      }

      const response = await fetch('/api/child-mode/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'garden' }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        router.push('/family-login')
        return
      }

      setMember(result.member)
      setXp(result.xp)
      setLoading(false)
    }

    getData()
  }, [])

  const level = getLevel(xp)
  const nextLevel = getNextLevel(level)
  const progressToNext = nextLevel
    ? Math.min(100, ((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)
    : 100

  const today = new Date().toISOString().split('T')[0]
  const lastActive = member?.last_active_date
  const isThirsty =
    lastActive &&
    lastActive < today &&
    new Date().getTime() - new Date(lastActive).getTime() > 86400000

  if (loading) {
    return (
      <ChildLoading
        text="جاري تحميل حديقتك..."
        icon={<GardenIcon size={48} color="var(--ghrs-green-500)" />}
      />
    )
  }

  const isMaxLevel = !nextLevel
  const xpInCurrentLevel = xp - level.minXp
  const xpForNext = nextLevel ? nextLevel.minXp - level.minXp : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      <div
        className="p-4 md:p-8 max-w-2xl mx-auto"
        style={{ paddingBottom: 'var(--ghrs-nav-total)' }}
      >
        {/* Theme toggle */}
        <div className="flex justify-end mb-2">
          <ThemeToggle />
        </div>

        {/* ===== SECTION A: Garden Identity / Hero ===== */}
        <div className="text-center mb-4">
          <h1
            className="text-2xl font-extrabold ghrs-garden-grow-in"
            style={{ color: 'var(--ghrs-text-primary)' }}
          >
            حديقتي
          </h1>
          <p
            className="text-sm font-semibold mt-1 ghrs-animate-fade-in"
            style={{ color: 'var(--ghrs-text-secondary)', animationDelay: '0.15s' }}
          >
            {isMaxLevel
              ? '恭喜! حديقتك أصبحت حديقة مزهرة!'
              : 'نزرع معاً حديقة جميلة بالإنجازات'}
          </p>
        </div>

        {/* ===== SECTION B: Garden Visual Scene ===== */}
        <div
          className="rounded-3xl mb-5 ghrs-garden-scene relative overflow-hidden"
          style={{
            minHeight: '260px',
            border: '1.5px solid var(--ghrs-green-200)',
            boxShadow: 'var(--ghrs-shadow-md)',
          }}
        >
          {/* Sky */}
          <div className="ghrs-garden-sky">
            {/* Sun / Moon */}
            <div
              className="absolute ghrs-garden-sun"
              style={{
                top: '12%',
                left: '15%',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fbbf24 40%, rgba(251,191,36,0.3) 70%, transparent 100%)',
                boxShadow: '0 0 20px rgba(251,191,36,0.4)',
              }}
            />

            {/* Clouds */}
            <div
              className="ghrs-garden-cloud ghrs-garden-sway-slow"
              style={{ top: '18%', right: '12%', width: '60px', height: '22px' }}
            />
            <div
              className="ghrs-garden-cloud ghrs-garden-sway-slow"
              style={{ top: '28%', right: '30%', width: '44px', height: '16px', animationDelay: '1s' }}
            />
            <div
              className="ghrs-garden-cloud ghrs-garden-sway-slow"
              style={{ top: '14%', left: '55%', width: '50px', height: '18px', animationDelay: '2s' }}
            />
          </div>

          {/* Ground */}
          <div className="ghrs-garden-ground">
            {/* Soil mound */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: '120px',
                height: '24px',
                background: `linear-gradient(to top, ${level.soilColor}, ${level.soilColor}cc)`,
                borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              }}
            />

            {/* Grass blades */}
            {[18, 30, 42, 55, 68, 78, 88].map((left, i) => (
              <div
                key={i}
                className="ghrs-garden-grass"
                style={{
                  left: `${left}%`,
                  height: `${14 + (i % 3) * 6}px`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}

            {/* Small flowers */}
            <span
              className="ghrs-garden-flower"
              style={{ bottom: '8px', left: '22%' }}
            >
              🌸
            </span>
            <span
              className="ghrs-garden-flower"
              style={{ bottom: '12px', right: '20%', fontSize: '0.9rem' }}
            >
              🌼
            </span>
          </div>

          {/* Water drops when thirsty */}
          {isThirsty &&
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="ghrs-garden-drop"
                style={{
                  top: '25%',
                  left: `${40 + i * 12}%`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}

          {/* Main Plant Visual */}
          <div
            className="absolute left-1/2 -translate-x-1/2 ghrs-garden-sway"
            style={{
              bottom: '24%',
              zIndex: 3,
              filter: isThirsty
                ? 'saturate(0.4) brightness(0.8)'
                : 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
              transition: 'filter 0.6s ease',
            }}
          >
            <span
              className={`block ${level.plantSize} ghrs-garden-glow`}
              style={{
                lineHeight: 1,
                transition: 'font-size 0.5s ease',
              }}
            >
              {level.emoji}
            </span>
          </div>

          {/* Thirsty Overlay */}
          {isThirsty && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <div
                className="text-center px-4 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              >
                <span className="text-lg">💧</span>
                <p className="text-xs font-bold mt-1" style={{ color: 'var(--ghrs-blue-600)' }}>
                  حديقتك عطشانة!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION C: Current → Next Goal ===== */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1.5px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{level.emoji}</span>
              <div>
                <p
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--ghrs-text-tertiary)' }}
                >
                  مستواي الآن
                </p>
                <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                  {level.name}
                </p>
              </div>
            </div>

            {nextLevel && (
              <div className="flex items-center gap-2 text-left">
                <div className="text-left">
                  <p
                    className="text-[10px] font-semibold"
                    style={{ color: 'var(--ghrs-text-tertiary)' }}
                  >
                    هدفي القادم
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                    {nextLevel.name}
                  </p>
                </div>
                <span className="text-xl">{nextLevel.emoji}</span>
              </div>
            )}
          </div>

          {/* XP Progress */}
          {nextLevel ? (
            <>
              <div className="ghrs-garden-xp-bar mb-2">
                <div
                  className="ghrs-garden-xp-fill"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
                  ⭐ {xp} / {nextLevel.minXp} XP
                </p>
                <p className="text-[11px] font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                  باقي {nextLevel.minXp - xp} XP
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm font-bold" style={{ color: 'var(--ghrs-green-600)' }}>
                🎉 وصلت لأعلى مستوى! حديقتك مزهرة!
              </p>
            </div>
          )}
        </div>

        {/* ===== SECTION D: Watering Motivation ===== */}
        <div
          className="rounded-3xl p-5 mb-4 text-center"
          style={{
            background: isThirsty
              ? 'linear-gradient(135deg, var(--ghrs-blue-50), var(--ghrs-bg-card))'
              : 'var(--ghrs-bg-card)',
            border: `1.5px solid ${isThirsty ? 'var(--ghrs-blue-200)' : 'var(--ghrs-border-default)'}`,
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <WaterIcon size={22} color={isThirsty ? 'var(--ghrs-blue-500)' : 'var(--ghrs-green-500)'} />
            <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
              {isThirsty ? '💧 اسقِ حديقتك!' : '🌱 حديقتك تنمو!'}
            </p>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>
            أنجز مهامك اليوم واجمع XP لتنمو حديقتك
          </p>
          <div
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{
              background: 'var(--ghrs-green-50)',
              color: 'var(--ghrs-green-700)',
              border: '1px solid var(--ghrs-green-200)',
            }}
          >
            <SparkleIcon size={14} color="var(--ghrs-green-600)" />
            إنجاز المهام = XP = نمو الحديقة
          </div>
        </div>

        {/* ===== SECTION E: Secondary Stats ===== */}
        <div
          className="rounded-3xl p-4 mb-4"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1.5px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2">
              <div
                className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center"
                style={{
                  background: 'var(--ghrs-amber-50)',
                  border: '1px solid var(--ghrs-amber-200)',
                }}
              >
                <FireIcon size={16} color="var(--ghrs-amber-600)" />
              </div>
              <p className="text-base font-extrabold" style={{ color: 'var(--ghrs-amber-600)' }}>
                {member?.current_streak || 0}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                السلسلة
              </p>
            </div>
            <div className="p-2">
              <div
                className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center"
                style={{
                  background: 'var(--ghrs-purple-50)',
                  border: '1px solid var(--ghrs-purple-200)',
                }}
              >
                <TrophyIcon size={16} color="var(--ghrs-purple-600)" />
              </div>
              <p className="text-base font-extrabold" style={{ color: 'var(--ghrs-purple-600)' }}>
                {member?.longest_streak || 0}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                أطول سلسلة
              </p>
            </div>
            <div className="p-2">
              <div
                className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center"
                style={{
                  background: 'var(--ghrs-blue-50)',
                  border: '1px solid var(--ghrs-blue-200)',
                }}
              >
                <ShieldIcon size={16} color="var(--ghrs-blue-600)" />
              </div>
              <p className="text-base font-extrabold" style={{ color: 'var(--ghrs-blue-600)' }}>
                {member?.grace_shields || 0}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                الدروع
              </p>
            </div>
          </div>
        </div>

        {/* ===== SECTION F: Growth Stages ===== */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'var(--ghrs-bg-card)',
            border: '1.5px solid var(--ghrs-border-default)',
            boxShadow: 'var(--ghrs-shadow-sm)',
          }}
        >
          {/* Toggle Header */}
          <button
            onClick={() => setShowAllStages(!showAllStages)}
            className="w-full p-4 flex items-center justify-between text-right"
            style={{ background: 'transparent' }}
            aria-expanded={showAllStages}
            aria-label="مراحل نمو حديقتي"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🌳</span>
              <p className="text-sm font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>
                مراحل نمو حديقتي
              </p>
            </div>
            <span
              className="text-xs font-bold transition-transform"
              style={{
                color: 'var(--ghrs-text-tertiary)',
                transform: showAllStages ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              ▼
            </span>
          </button>

          {/* Stages List - Always shows current/next, expands to show all */}
          <div
            className="px-4 pb-4"
            style={{
              maxHeight: showAllStages ? '500px' : '0',
              opacity: showAllStages ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.2s ease',
            }}
          >
            <div className="space-y-2">
              {LEVELS.map((l) => {
                const isCurrent = l.level === level.level
                const isUnlocked = xp >= l.minXp
                return (
                  <div
                    key={l.level}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: isCurrent ? 'var(--ghrs-green-50)' : 'var(--ghrs-bg-secondary)',
                      border: `1.5px solid ${isCurrent ? 'var(--ghrs-green-300)' : 'transparent'}`,
                      opacity: isUnlocked ? 1 : 0.5,
                    }}
                  >
                    <span className="text-xl flex-shrink-0">{l.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-xs"
                        style={{ color: 'var(--ghrs-text-primary)' }}
                      >
                        {l.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--ghrs-text-tertiary)' }}>
                        {l.minXp} XP
                      </p>
                    </div>
                    {isUnlocked ? (
                      <CheckIcon size={16} color="var(--ghrs-green-600)" />
                    ) : (
                      <LockIcon size={16} color="var(--ghrs-text-tertiary)" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ChildBottomNav />
    </div>
  )
}
