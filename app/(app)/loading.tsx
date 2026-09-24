import { PageShell } from '@/components/app/page-header';
import { Skeleton } from '@/components/ui/loading';

/**
 * Route-level loading UI for the authenticated workspace. Deliberately quiet —
 * it mirrors the page rhythm (heading, primary surface, a row of cards) so the
 * layout does not jump once content arrives.
 */
export default function AppLoading() {
  return (
    <PageShell width="wide" className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="h-36 w-full" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </PageShell>
  );
}
