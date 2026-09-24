'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Plus, Settings, SquarePen, type LucideIcon } from 'lucide-react';
import { isActiveRoute } from '@/lib/navigation';
import type { NavIconKey, NavItem } from '@/types';

const iconMap: Record<NavIconKey, LucideIcon> = {
  dashboard: SquarePen,
  studio: SquarePen,
  history: History,
  templates: SquarePen,
  favorites: History,
  settings: Settings,
};

export interface NavLinksProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function NavLinks({ items, onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const isNewPrompt = item.href === '/studio';
        const Icon = isNewPrompt ? Plus : iconMap[item.icon] || SquarePen;
        const active = isActiveRoute(pathname, item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#242424] text-[#F2F2F2] font-semibold border border-[#333333]'
                  : 'text-[#8E8E93] hover:bg-[#1A1A1A] hover:text-[#F2F2F2]'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? 'text-[#F2F2F2]' : 'text-[#636366]'}`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
