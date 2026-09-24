'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily: "'Cairo', sans-serif",
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f8fafc',
        }}
      >
        <div style={{ textAlign: 'center', padding: '16px', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#1e293b',
            }}
          >
            حدث خطأ
          </h1>
          <p
            style={{
              fontSize: '14px',
              marginBottom: '24px',
              color: '#64748b',
            }}
          >
            عذراً، حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 'bold',
              color: 'white',
              background: '#22c55e',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            إعادة تحميل
          </button>
        </div>
      </body>
    </html>
  );
}
