import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard layout with responsive navigation.
 * Includes MobileNav (bottom bar on mobile) and Sidebar (desktop/tablet),
 * with appropriate content padding for each breakpoint.
 */
export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <>
      <Sidebar />
      <MobileNav />
      <main className="pb-16 md:pb-0 md:pl-16 lg:pl-64">
        {children}
      </main>
      <Toaster position="top-right" />
    </>
  );
}
