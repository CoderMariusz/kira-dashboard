import { Home, Briefcase, ShoppingCart, Activity, Settings, type LucideIcon } from 'lucide-react';

/**
 * Navigation item configuration.
 */
export interface NavItem {
  /** Route path */
  href: string;
  /** Display label */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Show only in mobile navigation */
  mobileOnly?: boolean;
  /** Show only in desktop sidebar */
  desktopOnly?: boolean;
}

/**
 * All navigation items for the dashboard.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Dom', icon: Home },
  { href: '/work', label: 'Praca', icon: Briefcase },
  { href: '/shopping', label: 'Zakupy', icon: ShoppingCart },
  { href: '/activity', label: 'Historia', icon: Activity },
  { href: '/settings', label: 'Ustawienia', icon: Settings, desktopOnly: true },
];

/** Items for mobile bottom navigation (excludes desktopOnly) */
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(item => !item.desktopOnly);

/** Items for desktop/tablet sidebar (excludes mobileOnly) */
export const SIDEBAR_NAV_ITEMS = NAV_ITEMS.filter(item => !item.mobileOnly);
