import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/provider";

export const metadata: Metadata = {
  title: "غرس - GHRS | ازرع العادة، واحصد الإنجاز",
  description: "تطبيق عائلي لبناء عادات إيجابية لدى الأطفال. حوّل الأعمال اليومية إلى تجربة نمو ممتعة مع نظام المكافآت والتحديات.",
  icons: {
    icon: "/favicon.ico",
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
      </body>
    </html>
  );
}
