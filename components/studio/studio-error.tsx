'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pencil, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ANALYZE_ERROR_REASSURANCE } from '@/lib/analyze-messages';
import type { AnalyzeFailure } from '@/lib/analyze-client';

const HEADING_ID = 'studio-error-heading';

export interface StudioErrorProps {
  failure: AnalyzeFailure;
  /** Re-runs the analysis on the same text. Never automatic. */
  onRetry: () => void;
  /** Returns to the composer with the text intact. */
  onEdit: () => void;
}

/**
 * The analysis failed.
 *
 * Two things matter on this screen: the user's text is still there, and trying
 * again is their decision. Nothing retries on a timer — a provider outage would
 * turn that into a loop the user cannot see or stop.
 *
 * The message comes from the shared failure copy, which never names the
 * provider, a status code or an environment variable.
 */
export function StudioError({ failure, onRetry, onEdit }: StudioErrorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();

  // The analysing surface has been removed, so focus is moved to the heading —
  // otherwise the failure is silent for anyone not watching the screen.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // A retry cannot fix an expired session, so that one case offers a way back
  // in instead. `returnUrl` brings them straight back to the studio.
  const expired = failure.code === 'UNAUTHENTICATED';

  return (
    <Card variant="elevated" className="space-y-5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 space-y-1">
          <h2
            ref={headingRef}
            id={HEADING_ID}
            tabIndex={-1}
            className="text-lg font-semibold text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            {failure.message}
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">{ANALYZE_ERROR_REASSURANCE}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {!expired && (
          <Button type="button" variant="primary" size="md" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Try again</span>
          </Button>
        )}

        <Button type="button" variant="secondary" size="md" onClick={onEdit} className="gap-2">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span>Edit idea</span>
        </Button>
      </div>

      {expired && (
        <p className="text-sm leading-relaxed text-slate-400">
          <Link
            href={`/login?returnUrl=${encodeURIComponent(pathname)}`}
            className="font-medium text-emerald-400 underline decoration-emerald-500/40 underline-offset-4 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14]"
          >
            Sign in again
          </Link>{' '}
          to pick up where you left off.
        </p>
      )}
    </Card>
  );
}
