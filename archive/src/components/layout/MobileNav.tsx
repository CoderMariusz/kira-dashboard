'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_NAV_ITEMS, type NavItem } from '@/lib/config/navigation';

/**
 * Fixed bottom navigation bar for mobile (<768px).
 * Highlights active route and provides icon + label navigation.
 * 
 * @component
 */
export function MobileNav() {
  const pathname = usePathname();

  const navElements = useMemo(
    () =>
      MOBILE_NAV_ITEMS.map((item: NavItem) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
              isActive
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-6 w-6 mb-1" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      }),
    [pathname]
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden w-full"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around">{navElements}</div>
    </nav>
  );
}
