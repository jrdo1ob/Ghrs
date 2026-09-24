import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--ghrs-bg-primary)' }}
    >
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ghrs-text-primary)' }}>
          الصفحة غير موجودة
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ghrs-text-secondary)' }}>
          عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl font-bold text-white transition-colors"
          style={{ background: 'var(--ghrs-green-600)' }}
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
