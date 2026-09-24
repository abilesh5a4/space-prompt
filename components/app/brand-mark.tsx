'use client';

import Link from 'next/link';
import { AssistantMark } from '@/components/ui/assistant-mark';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/studio"
      aria-label="Space Prompt Home"
      className={`group flex items-center gap-2 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none ${className}`}
    >
      <AssistantMark size="md" />
    </Link>
  );
}
