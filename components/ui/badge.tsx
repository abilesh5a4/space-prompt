import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'outline';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors select-none';

  const variants = {
    default: 'bg-slate-800/80 text-slate-300 border border-slate-700/50',
    accent: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    outline: 'border border-slate-700 text-slate-400 hover:text-slate-200',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
