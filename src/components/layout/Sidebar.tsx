'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SIDEBAR_NAV_ITEMS, type NavItem } from '@/lib/config/navigation';

/**
 * Responsive sidebar navigation.
 * - Hidden on mobile (<768px)
 * - Collapsible on tablet (768-1024px) - icons only when collapsed
 * - Always expanded on desktop (>1024px)
 * 
 * @component
 */
export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const navElements = useMemo(
    () =>
      SIDEBAR_NAV_ITEMS.map((item: NavItem) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className={`${isCollapsed ? 'hidden lg:block' : 'block'}`}>
              {item.label}
            </span>
          </Link>
        );
      }),
    [pathname, isCollapsed]
  );

  return (
    <nav
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 hidden md:flex lg:flex lg:w-64 flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      data-collapsed={isCollapsed}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2
          className={`font-bold text-lg text-gray-900 ${
            isCollapsed ? 'hidden lg:block' : 'block'
          }`}
        >
          Kira Dashboard
        </h2>
      </div>

      {/* Toggle button - visible on tablet, hidden on desktop */}
      <button
        onClick={handleToggle}
        className="absolute top-4 -right-3 bg-white border border-gray-200 rounded-full p-1 md:flex lg:hidden hover:bg-gray-50"
        aria-label="Toggle sidebar"
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600" aria-hidden="true" />
        )}
      </button>

      {/* Navigation items */}
      <div className="flex-1 py-4">{navElements}</div>
    </nav>
  );
}
