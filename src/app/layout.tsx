import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
}

export const metadata: Metadata = {
  title: "غرس - GHRS | ازرع العادة، واحصد الإنجاز",
  description: "تطبيق عائلي لبناء عادات إيجابية لدى الأطفال. حوّل الأعمال اليومية إلى تجربة نمو ممتعة مع نظام المكافآت والتحديات.",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "غرس",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased min-h-screen" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {})
            })
          }
        `}} />
      </body>
    </html>
  );
}
