'use client';

import { motion } from 'framer-motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--ghrs-bg-primary)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ghrs-text-primary)' }}>
          حدث خطأ
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ghrs-text-secondary)' }}>
          عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={reset}
          className="px-6 py-3 rounded-xl font-bold text-white transition-colors"
          style={{ background: 'var(--ghrs-green-600)' }}
        >
          حاول مرة أخرى
        </motion.button>
      </motion.div>
    </div>
  );
}
