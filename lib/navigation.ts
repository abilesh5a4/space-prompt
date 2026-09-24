import type { NavItem } from '@/types';

export const primaryNav: NavItem[] = [
  { href: '/studio', label: 'New Prompt', icon: 'studio', emphasis: true },
];

export const secondaryNav: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
