'use client';

interface AssistantMarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AssistantMark({ size = 'md', className = '' }: AssistantMarkProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  const innerDotClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }[size];

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-[#181819] border border-[#29292B] shadow-[0_0_8px_rgba(56,189,248,0.15)] ${sizeClasses} ${className}`}
      aria-hidden="true"
    >
      <span className={`rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8] ${innerDotClasses}`} />
    </div>
  );
}
