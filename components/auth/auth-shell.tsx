import React from 'react';
import Link from 'next/link';
import { SpaceOrbitAnimation } from '@/components/ui/space-orbit-animation';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0D0D0D] text-[#F2F2F2] relative">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <SpaceOrbitAnimation size="sm" />
            <span className="font-semibold text-base tracking-tight text-[#F2F2F2]">
              Space Prompt
            </span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2]">{title}</h1>
            <p className="text-xs text-[#8E8E93]">{subtitle}</p>
          </div>
        </div>

        {/* Auth Container Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-[#262626] bg-[#141414] shadow-xl space-y-6">
          {children}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-[#636366]">
          Space Prompt &copy; {new Date().getFullYear()} • Turn ideas into better prompts.
        </p>
      </div>
    </div>
  );
}
