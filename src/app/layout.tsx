import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { InstallPrompt } from '@/components/InstallPrompt';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

/**
 * PWA viewport configuration.
 * Separated from metadata per Next.js 16 requirement.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3B82F6',
};

/**
 * App metadata including PWA manifest, Apple Web App config, and icons.
 */
export const metadata: Metadata = {
  title: 'Kira Dashboard',
  description: 'Family task management with Kanban boards and shopping lists',
  applicationName: 'Kira Dashboard',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kira Dashboard',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={cn(inter.className, "overflow-x-hidden")}>
        <Providers>{children}</Providers>
        <InstallPrompt />
      </body>
    </html>
  );
}
