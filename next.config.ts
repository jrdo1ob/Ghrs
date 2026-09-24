import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers + caching for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ─── Cache Control ──────────────────────────────────
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
          // ─── HTTP Security Headers (F2) ────────────────────
          // HSTS: Force HTTPS for 2 years. Vercel serves only HTTPS.
          // No includeSubDomains/preload — not verified for all subdomains.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000',
          },
          // CSP: Designed from actual application resource usage.
          // - 'unsafe-inline' required: inline service worker registration in layout.tsx
          // - Google Fonts loaded via CSS @import (fonts.googleapis.com + fonts.gstatic.com)
          // - Supabase API calls (auth + database)
          // - Quran API external fetch (api.alquran.cloud)
          // - No iframes, no eval, no WebSocket usage
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://ghrs-cyan.vercel.app",
              "connect-src 'self' https://*.supabase.co https://api.alquran.cloud",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join('; '),
          },
          // Clickjacking: no iframes allowed
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // MIME sniffing prevention
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer: full URL same-origin, origin-only cross-origin, none cross-protocol
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Disable unused browser APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
        ],
      },
      {
        // Static assets can still be cached (they have hashed names)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
