import type { NavItem } from '@/types';

/**
 * Primary workspace navigation, rendered in both the desktop sidebar and the
 * mobile drawer so the two can never drift apart.
 *
 * Inspired by Google AI Studio: minimal, focused sidebar with only New Prompt, History, and Settings.
 */
export const primaryNav: NavItem[] = [
  { href: '/studio', label: 'New Prompt', icon: 'studio', emphasis: true },
  { href: '/history', label: 'History', icon: 'history' },
];

/** Pinned to the bottom of the sidebar, above the account menu. */
export const secondaryNav: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

/**
 * True when `href` is the active route. Exact matching is enough today; nested
 * routes (e.g. `/history/abc`) are handled by the prefix check so deep links
 * still highlight their section.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
