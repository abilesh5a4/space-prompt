import Link from 'next/link';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/studio"
      className={`group flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none ${className}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A1A1A] border border-[#262626] text-[#38BDF8]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#38BDF8]" />
      </span>
      <span className="text-sm font-semibold tracking-tight text-[#F2F2F2]">
        Space Prompt
      </span>
    </Link>
  );
}
