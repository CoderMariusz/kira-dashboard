import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard layout with responsive navigation.
 * Includes MobileNav (bottom bar on mobile) and Sidebar (desktop/tablet),
 * with appropriate content padding for each breakpoint.
 * ErrorBoundary catches React rendering errors (e.g., hooks violations)
 * and shows a recovery UI instead of a blank white screen.
 */
export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <>
      <Sidebar />
      <MobileNav />
      <main className="pb-16 md:pb-0 md:pl-16 lg:pl-64">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <Toaster position="top-right" />
    </>
  );
}
