'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/app/page-header';

/**
 * Error boundary for the authenticated workspace.
 *
 * Shows a plain recovery message only — the error object is intentionally not
 * rendered, so a stack trace or digest never reaches the UI. `retry` is the
 * stable Next 16 recovery prop (it re-fetches and re-renders the boundary's
 * children, unlike the older `reset`).
 */
export default function AppError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PageShell width="focused">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#0E1420] px-6 py-16 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
        </span>

        <h1 className="text-xl font-bold tracking-tight text-white">Something went wrong.</h1>

        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
          This part of your workspace failed to load. Nothing you have saved is affected.
        </p>

        <Button variant="secondary" size="md" className="mt-6 gap-2" onClick={() => retry()}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Try again</span>
        </Button>
      </div>
    </PageShell>
  );
}
