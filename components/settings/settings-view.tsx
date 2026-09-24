'use client';

import { useState } from 'react';
import { LogOut, UserPlus, Info, ShieldCheck } from 'lucide-react';
import { UserAvatar } from '@/components/app/user-avatar';
import { Button } from '@/components/ui/button';
import type { UserDisplayData } from '@/types';

export interface SettingsViewProps {
  user: UserDisplayData;
}

export function SettingsView({ user }: SettingsViewProps) {
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pt-4">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-[#F2F2F2]">Settings</h1>
        <p className="text-xs text-[#8E8E93]">Manage your account details and authentication session.</p>
      </div>

      {/* Account Section */}
      <section className="rounded-2xl border border-[#262626] bg-[#141414] p-5 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
          Account Profile
        </h2>

        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#F2F2F2] truncate">{user.name}</h3>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#1A1A1A] border border-[#262626] text-[#38BDF8]">
                <ShieldCheck className="h-3 w-3" />
                Active
              </span>
            </div>
            <p className="text-xs text-[#8E8E93] truncate">{user.email || 'No email associated'}</p>
          </div>
        </div>

        <div className="border-t border-[#262626] pt-3 flex items-center justify-between text-xs text-[#8E8E93]">
          <span>Authentication Provider</span>
          <span className="font-medium text-[#F2F2F2]">Supabase Auth</span>
        </div>
      </section>

      {/* Account Actions Section */}
      <section className="rounded-2xl border border-[#262626] bg-[#141414] p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
          Account Actions
        </h2>

        {/* Add Account */}
        <div className="flex items-center justify-between py-2 border-b border-[#262626]">
          <div>
            <h3 className="text-xs font-semibold text-[#F2F2F2]">Add Secondary Account</h3>
            <p className="text-[11px] text-[#8E8E93]">Connect additional OAuth identities for fast account switching.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddAccountModal(true)}
            className="px-3 py-1.5 rounded-xl border border-[#262626] bg-[#1A1A1A] hover:bg-[#242424] text-xs font-medium text-[#F2F2F2] flex items-center gap-1.5 transition-colors shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Account</span>
          </button>
        </div>

        {/* Sign Out */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h3 className="text-xs font-semibold text-[#F2F2F2]">Sign Out</h3>
            <p className="text-[11px] text-[#8E8E93]">Terminate your active session on this device.</p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </section>

      {/* Add Account Informational Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#262626] bg-[#141414] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#38BDF8]">
              <Info className="h-5 w-5" />
              <h3 className="text-sm font-semibold text-[#F2F2F2]">Multi-Account Management</h3>
            </div>

            <p className="text-xs text-[#8E8E93] leading-relaxed">
              You are currently authenticated as <strong className="text-[#F2F2F2]">{user.email}</strong>. Multi-account profile switching allows linking multiple Google or Supabase identities seamlessly.
            </p>

            <div className="p-3 rounded-xl bg-[#1A1A1A] border border-[#262626] text-xs text-[#8E8E93]">
              Primary account is active. Secondary accounts can be linked in future updates.
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddAccountModal(false)}
                className="bg-[#38BDF8] hover:bg-[#0284C7] text-slate-950 font-medium text-xs rounded-xl px-4"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
