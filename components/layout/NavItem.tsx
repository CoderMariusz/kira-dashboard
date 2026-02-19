// src/components/layout/NavItem.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItemConfig } from './NavConfig';

interface NavItemProps {
  item: NavItemConfig;
}

export function NavItem({ item }: NavItemProps) {
  const pathname = usePathname() ?? ''; // pathname może być null podczas SSR
  
  // Active gdy pathname dokładnie pasuje lub pathname zaczyna się od href + "/"
  // Wyjątek: "/" nie jest traktowane jako prefix dla wszystkiego
  const cleanPathname = pathname.split('?')[0] ?? ''; // Usuń query params
  const isActive = cleanPathname === item.href || 
    (item.href !== '/' && cleanPathname.startsWith(item.href + '/'));

  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] mb-0.5',
        'transition-colors duration-150',
        isActive
          ? 'bg-[#1e1b4b] text-[#818cf8] font-semibold'    // aktywny: fioletowe tło + jasny fioletowy tekst
          : 'text-[#6b7280] hover:bg-[#2a2540] hover:text-[#e6edf3]'  // nieaktywny
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="w-4 text-center text-[13px]" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
