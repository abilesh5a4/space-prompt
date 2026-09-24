'use client';

import { useState } from 'react';
import { LogOut, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { UserAvatar } from '@/components/app/user-avatar';
import { requestClearPrompts } from '@/lib/prompts-client';
import type { UserDisplayData } from '@/types';

export interface SettingsViewProps {
  user: UserDisplayData;
}

export function SettingsView({ user }: SettingsViewProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const handleClearHistory = async () => {
    setIsClearing(true);
    setClearError(null);
    const res = await requestClearPrompts();
    setIsClearing(false);

    if (res.ok) {
      setShowClearConfirm(false);
      setClearSuccess(true);
      window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
      setTimeout(() => setClearSuccess(false), 3000);
    } else {
      setClearError(res.error || 'Failed to clear history');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pt-4 px-4 pb-20">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#F4F4F5]">Settings</h1>
        <p className="text-sm text-[#A1A1AA]">Manage your account details and saved data.</p>
      </div>

      {/* Account Section */}
      <section className="rounded-2xl border border-[#29292B] bg-[#181819] p-5 space-y-4 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
          Account
        </h2>

        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#F4F4F5] truncate">{user.name}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#111112] border border-[#29292B] text-[#38BDF8]">
                <ShieldCheck className="h-3 w-3" />
                Active
              </span>
            </div>
            <p className="text-sm text-[#A1A1AA] truncate">{user.email || 'No email associated'}</p>
          </div>
        </div>
      </section>

      {/* History & Data Section */}
      <section className="rounded-2xl border border-[#29292B] bg-[#181819] p-5 space-y-4 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
          History & Data
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
          <div>
            <h3 className="text-sm font-semibold text-[#F4F4F5]">Clear history</h3>
            <p className="text-xs text-[#A1A1AA]">Delete all saved prompt history from your account.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="px-3.5 py-2 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-xs font-medium text-red-400 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear history</span>
          </button>
        </div>

        {clearSuccess && (
          <p className="text-xs text-[#38BDF8] pt-1">All saved prompt history cleared.</p>
        )}
      </section>

      {/* Sign Out Section */}
      <section className="rounded-2xl border border-[#29292B] bg-[#181819] p-5 space-y-4 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
          Session
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
          <div>
            <h3 className="text-sm font-semibold text-[#F4F4F5]">Sign Out</h3>
            <p className="text-xs text-[#A1A1AA]">Terminate your active session on this device.</p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl border border-[#29292B] bg-[#111112] hover:bg-[#242424] text-xs font-medium text-[#F4F4F5] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <LogOut className="h-3.5 w-3.5 text-[#71717A]" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </section>

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#29292B] bg-[#181819] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-semibold text-[#F4F4F5]">Clear all history?</h3>
            </div>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              This will permanently delete all saved prompts from your account. This action cannot be undone.
            </p>

            {clearError && <p className="text-xs text-red-400">{clearError}</p>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[#29292B] text-xs text-[#F4F4F5] hover:bg-[#242424] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isClearing}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isClearing ? 'Clearing...' : 'Clear history'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
