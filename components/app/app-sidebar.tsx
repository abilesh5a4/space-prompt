'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { primaryNav, secondaryNav } from '@/lib/navigation';
import { BrandMark } from './brand-mark';
import { NavLinks } from './nav-links';
import { SidebarRecents } from './sidebar-recents';
import { UserAvatar } from './user-avatar';
import type { UserDisplayData } from '@/types';

export function AppSidebar({ user }: { user: UserDisplayData }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="flex lg:hidden items-center justify-between h-12 px-4 bg-[#111112] border-b border-[#29292B] fixed top-0 left-0 right-0 z-40">
        <BrandMark />
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#181819]"
          aria-label="Toggle navigation sidebar"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Drawer Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[260px] lg:w-[240px] flex flex-col border-r border-[#29292B] bg-[#111112] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Minimal Header */}
        <div className="flex h-12 shrink-0 items-center px-4 border-b border-[#29292B]">
          <BrandMark />
        </div>

        {/* Scrollable Nav Area */}
        <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          <NavLinks items={primaryNav} onNavigate={() => setMobileOpen(false)} />
          <SidebarRecents onNavigate={() => setMobileOpen(false)} />
        </nav>

        {/* Bottom Profile & Settings */}
        <div className="shrink-0 border-t border-[#29292B] p-3 space-y-2">
          <NavLinks items={secondaryNav} onNavigate={() => setMobileOpen(false)} />

          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-[#29292B] bg-[#181819] hover:bg-[#242424] transition-colors"
          >
            <UserAvatar user={user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#F4F4F5] truncate">{user.name}</p>
              {user.email && (
                <p className="text-[11px] text-[#71717A] truncate">{user.email}</p>
              )}
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
