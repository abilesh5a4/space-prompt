'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { primaryNav, secondaryNav } from '@/lib/navigation';
import { BrandMark } from './brand-mark';
import { NavLinks } from './nav-links';
import { UserAvatar } from './user-avatar';
import type { UserDisplayData } from '@/types';

export function AppSidebar({ user }: { user: UserDisplayData }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar toggle button */}
      <div className="flex lg:hidden items-center justify-between h-12 px-4 bg-[#121212] border-b border-[#262626] fixed top-0 left-0 right-0 z-40">
        <BrandMark />
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#1A1A1A]"
          aria-label="Toggle navigation sidebar"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] flex flex-col border-r border-[#262626] bg-[#121212] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#262626] px-4">
          <BrandMark />
        </div>

        {/* Primary Navigation Links */}
        <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <NavLinks items={primaryNav} onNavigate={() => setMobileOpen(false)} />
        </nav>

        {/* Bottom Profile & Secondary Nav */}
        <div className="shrink-0 border-t border-[#262626] p-3 space-y-2">
          <NavLinks items={secondaryNav} onNavigate={() => setMobileOpen(false)} />

          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-[#262626] bg-[#1A1A1A] hover:bg-[#242424] transition-colors"
          >
            <UserAvatar user={user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#F2F2F2] truncate">{user.name}</p>
              {user.email && (
                <p className="text-[11px] text-[#8E8E93] truncate">{user.email}</p>
              )}
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
