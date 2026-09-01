'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
}

const float = {
  animate: {
    y: [-5, 5, -5],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
}

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Background */}
        <div className="absolute inset-0 opacity-15" style={{ background: 'linear-gradient(135deg, var(--ghrs-green-200) 0%, var(--ghrs-amber-100) 50%, var(--ghrs-green-100) 100%)' }} />

        {/* Floating emojis */}
        {['🌱','🌿','🌳','🏡','⭐','💧'].map((e, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl md:text-6xl opacity-15 select-none pointer-events-none"
            style={{ top: `${15 + (i * 13) % 60}%`, right: `${5 + (i * 17) % 80}%` }}
            animate={{ y: [-8, 8, -8], rotate: [-3, 3, -3] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          >
            {e}
          </motion.div>
        ))}

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-6"
          >
            <span className="text-7xl md:text-8xl inline-block">🌱</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold mb-3"
            style={{ color: 'var(--ghrs-green-700)' }}
          >
            غرس
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl font-bold mb-2"
            style={{ color: 'var(--ghrs-text-secondary)' }}
          >
            ازرع العادة، واحصد الإنجاز
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-base md:text-lg mb-10 max-w-xl mx-auto"
            style={{ color: 'var(--ghrs-text-tertiary)' }}
          >
            حوّل الأعمال اليومية إلى مغامرة نمو ممتعة لطفلك
          </motion.p>

          {/* ★★★ CHILD HERO BUTTON ★★★ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 150 }}
          >
            <Link
              href="/family-login"
              className="group inline-flex items-center gap-4 px-10 py-6 rounded-2xl text-2xl md:text-3xl font-extrabold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-3xl"
              style={{
                background: 'linear-gradient(135deg, var(--ghrs-amber-400) 0%, var(--ghrs-amber-500) 50%, var(--ghrs-amber-600) 100%)',
                boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)',
              }}
            >
              <span className="text-4xl md:text-5xl group-hover:animate-bounce">🧒</span>
              <span>ادخل يا بطل!</span>
              <span className="text-3xl">🚀</span>
            </Link>
          </motion.div>

          {/* PARENT LOGIN BUTTON */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 150 }}
            whileHover={{ scale: 1.05 }}
            className="mt-4"
          >
            <Link
              href="/owner-login"
              className="group inline-flex items-center gap-3 px-6 py-3 rounded-xl text-lg font-bold transition-all duration-300"
              style={{
                background: 'transparent',
                border: '2px solid var(--ghrs-green-400)',
                color: 'var(--ghrs-green-600)',
              }}
            >
              <span className="text-2xl">👨‍👩‍👧</span>
              <span>دخول ولي الأمر</span>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm mt-4 font-semibold"
            style={{ color: 'var(--ghrs-amber-600)' }}
          >
            ⭐ أدخل كودك و PIN وابدأ مغامرك
          </motion.p>

          {/* Garden Progression */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-14 flex items-center justify-center gap-3 md:gap-6"
          >
            {[
              { emoji: '🌰', name: 'البذرة' },
              { emoji: '🌱', name: 'البرعم' },
              { emoji: '🌿', name: 'النبتة' },
              { emoji: '🌳', name: 'الشجرة' },
              { emoji: '🏡', name: 'الحديقة' },
            ].map((level, i) => (
              <motion.div
                key={i}
                className="text-center"
                whileHover={{ scale: 1.2, y: -5 }}
              >
                <div className="text-3xl md:text-4xl mb-1">{level.emoji}</div>
                <p className="text-xs font-bold" style={{ color: 'var(--ghrs-text-tertiary)' }}>{level.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="px-4 py-16" style={{ background: 'var(--ghrs-bg-secondary)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ color: 'var(--ghrs-text-primary)' }}
          >
            كيف يعمل غرس؟
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📋', title: 'المهام اليومية', desc: 'أنشئ مهاماً مخصصة لكل طفل. كل مهمة تقربه من شجرته.' },
              { icon: '⭐', title: 'نقاط الخبرة', desc: 'كل مهمة مكتملة تمنح الطفل نقاط خبرة. اجمع النقاط وارتقِ.' },
              { icon: '🌳', title: 'الحديقة', desc: 'شاهد حديقتك تنمو مع كل إنجاز. من بذرة إلى حديقة مزهرة.' },
              { icon: '💰', title: 'المكافآت المالية', desc: 'حوّل الخبرات إلى مكافآت حقيقية. طفلك يتعلم قيمة العمل.' },
              { icon: '🏆', title: 'الإنجازات', desc: 'افتح شارات جديدة مع كل تحدٍ. عنصر المفاجأة والحماس.' },
              { icon: '👨‍👩‍👧‍👦', title: 'للعائلات', desc: 'مصمم للعائلات العربية. دعم كامل للغة العربية وتجربة RTL.' },
            ].map((f, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="ghrs-card p-6 text-center ghrs-card-interactive"
              >
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ghrs-text-primary)' }}>{f.title}</h3>
                <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ LOGIN OPTIONS ═══════ */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-10"
            style={{ color: 'var(--ghrs-text-primary)' }}
          >
            اختر طريقة الدخول
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/owner-login" className="block ghrs-card p-6 ghrs-card-interactive">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">👨‍👩‍👧</span>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>ولي الأمر</h3>
                    <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>إدارة العائلة والمهمات</p>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>
                  سجّل دخولك لإدارة أبناءك وإنشاء المهام ومتابعة تقدمهم.
                </p>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/family-login" className="block ghrs-card p-6 ghrs-card-interactive" style={{ border: '2px solid var(--ghrs-amber-400)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🧒</span>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>الطفل</h3>
                    <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>لإنجاز المهام وجمع النقاط</p>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>
                  أدخل كودك الشخصي ورمز PIN لبدء مغامرة النمو.
                </p>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="px-4 py-8 text-center" style={{ background: 'var(--ghrs-bg-secondary)', borderTop: '1px solid var(--ghrs-border-default)' }}>
        <p className="text-sm" style={{ color: 'var(--ghrs-text-tertiary)' }}>
          🌱 غرس — ازرع العادة، واحصد الإنجاز
        </p>
      </footer>
    </main>
  )
}
