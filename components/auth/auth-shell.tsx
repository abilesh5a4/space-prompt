import React from 'react';
import { AssistantMark } from '@/components/ui/assistant-mark';

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0B0B0C] text-[#F4F4F5] relative">
      <div className="w-full max-w-sm space-y-6">
        {/* Minimal Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <AssistantMark size="lg" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">Space Prompt</h1>
            <p className="text-xs text-[#A1A1AA]">Turn ideas into better prompts.</p>
          </div>
        </div>

        {/* Auth Container Card */}
        <div className="p-6 rounded-2xl border border-[#29292B] bg-[#181819] shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
