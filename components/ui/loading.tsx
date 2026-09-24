import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export function Spinner({ className = 'w-5 h-5 text-emerald-400' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-800/60 ${className}`} />
  );
}

export function SpacePromptThinking({ message = 'Space Prompt is thinking...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0E1420] border border-slate-800 text-xs font-medium text-slate-300 shadow-lg">
      <div className="relative flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span className="absolute w-full h-full rounded-full bg-emerald-500/20 animate-ping" />
      </div>
      <span>{message}</span>
    </div>
  );
}
