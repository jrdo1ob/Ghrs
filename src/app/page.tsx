import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--ghrs-bg-primary)' }}>
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32">
        {/* Background Gradient */}
        <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(135deg, var(--ghrs-green-100) 0%, var(--ghrs-amber-50) 50%, var(--ghrs-green-50) 100%)' }} />
        
        {/* Floating Elements */}
        <div className="absolute top-20 right-10 text-6xl opacity-20 animate-bounce" style={{ animationDelay: '0s' }}>🌱</div>
        <div className="absolute top-40 left-20 text-5xl opacity-20 animate-bounce" style={{ animationDelay: '0.5s' }}>🌿</div>
        <div className="absolute bottom-20 right-1/4 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '1s' }}>🌳</div>
        <div className="absolute bottom-10 left-10 text-6xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s' }}>🏡</div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <span className="text-7xl md:text-8xl">🌱</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: 'var(--ghrs-green-700)' }}>
            غرس
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl font-semibold mb-4" style={{ color: 'var(--ghrs-text-secondary)' }}>
            ازرع العادة، واحصد الإنجاز
          </p>
          
          {/* Description */}
          <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto" style={{ color: 'var(--ghrs-text-tertiary)' }}>
            حوّل الأعمال اليومية إلى مغامرة نمو ممتعة لطفلك. 
            نظام المكافآت والتحديات يبني عادات إيجابية بالمرح والتشجيع.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/owner-signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: 'var(--ghrs-green-600)' }}
            >
              <span>🌱</span>
              <span>ابدأ مجاناً</span>
            </Link>
            <Link
              href="/owner-login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105"
              style={{ background: 'var(--ghrs-bg-card)', border: '2px solid var(--ghrs-green-600)', color: 'var(--ghrs-green-700)' }}
            >
              <span>👋</span>
              <span>لدي حساب</span>
            </Link>
          </div>

          {/* Garden Progression */}
          <div className="mt-16 flex items-center justify-center gap-4 md:gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-2">🌰</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>البذرة</p>
            </div>
            <div className="text-2xl" style={{ color: 'var(--ghrs-text-tertiary)' }}>←</div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-2">🌱</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>البرعم</p>
            </div>
            <div className="text-2xl" style={{ color: 'var(--ghrs-text-tertiary)' }}>←</div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-2">🌿</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>النبتة</p>
            </div>
            <div className="text-2xl" style={{ color: 'var(--ghrs-text-tertiary)' }}>←</div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-2">🌳</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ghrs-text-secondary)' }}>الشجرة</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20" style={{ background: 'var(--ghrs-bg-secondary)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: 'var(--ghrs-text-primary)' }}>
            كيف يعمل غرس؟
          </h2>
          <p className="text-center mb-16 max-w-2xl mx-auto" style={{ color: 'var(--ghrs-text-secondary)' }}>
            نظام متكامل يجمع بين التعليم والمرح
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="ghrs-card p-8 text-center ghrs-card-interactive">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>المهام اليومية</h3>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                أنشئ مهاماً مخصصة لكل طفل. من نظافة الغرفة إلى المذاكرة، كل مهمة تقربه من شجرته.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="ghrs-card p-8 text-center ghrs-card-interactive">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>نقاط الخبرة</h3>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                كل مهمة مكتملة تمنح الطفل نقاط خبرة. اجمع النقاط وارتقِ بالمستويات.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="ghrs-card p-8 text-center ghrs-card-interactive">
              <div className="text-5xl mb-4">🌳</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>الحديقة</h3>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                شاهد حديقتك تنمو مع كل إنجاز. من بذرة صغيرة إلى حديقة مزهرة.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="ghrs-card p-8 text-center ghrs-card-interactive">
              <div className="text-5xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>المكافآت المالية</h3>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                حوّل الخبرات إلى مكافآت حقيقية. طفلك يتعلم قيمة العمل والادخار.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="ghrs-card p-8 text-center ghrs-card-interactive">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>الإنجازات</h3>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                افتح شارات جديدة مع كل تحدٍ. الإنجازات تضيف عنصر المفاجأة والحماس.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="ghrs-card p-8 text-center ghrs-card-interactive">
              <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--ghrs-text-primary)' }}>للعائلات</h3>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                مصمم للعائلات العربية. دعم كامل للغة العربية وتجربة RTL أصلية.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Options Section */}
      <section className="px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: 'var(--ghrs-text-primary)' }}>
            اختر طريقة الدخول
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parent Login */}
            <Link href="/owner-login" className="ghrs-card p-8 ghrs-card-interactive">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">👨‍👩‍👧</span>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>ولي الأمر</h3>
                  <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>لإدارة العائلة والمهمات</p>
                </div>
              </div>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                سجّل دخولك لإدارة أبناءك وإنشاء المهام ومتابعة تقدمهم.
              </p>
            </Link>

            {/* Child Login */}
            <Link href="/family-login" className="ghrs-card p-8 ghrs-card-interactive" style={{ border: '2px solid var(--ghrs-amber-400)' }}>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">👶</span>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--ghrs-text-primary)' }}>الطفل</h3>
                  <p className="text-sm" style={{ color: 'var(--ghrs-text-secondary)' }}>لإنجاز المهام وجمع النقاط</p>
                </div>
              </div>
              <p style={{ color: 'var(--ghrs-text-secondary)' }}>
                أدخل كودك الشخصي ورمز PIN لبدء مغامرة النمو.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center" style={{ background: 'var(--ghrs-bg-secondary)', borderTop: '1px solid var(--ghrs-border-default)' }}>
        <p className="text-sm" style={{ color: 'var(--ghrs-text-tertiary)' }}>
          🌱 غرس - ازرع العادة، واحصد الإنجاز
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--ghrs-text-tertiary)' }}>
          تطبيق عائلي لبناء عادات إيجابية لدى الأطفال
        </p>
      </footer>
    </main>
  )
}
