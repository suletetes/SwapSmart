import type { Metadata, Viewport } from 'next';
import { Inter, DM_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { SkipToContent } from '@/components/ui/SkipToContent';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SwapSmart — AI Battery Swap Network',
  description:
    'AI-powered battery-swap network intelligence platform for Nigeria\'s electric tricycle ecosystem.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SwapSmart',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dmSans.variable} font-body bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark min-h-dvh antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <SkipToContent />
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
