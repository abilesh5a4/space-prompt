import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Usually a single primary action link. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shared empty state. Used wherever there is genuinely nothing to show yet —
 * recent prompts, history, favorites — so the absence of data reads as honest
 * rather than broken.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#0E1420]/60 px-6 py-14 text-center ${className}`}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-[#121A2A] text-slate-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <p className="text-base font-semibold text-slate-200">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
