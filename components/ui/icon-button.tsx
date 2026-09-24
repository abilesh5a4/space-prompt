import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'ghost' | 'secondary' | 'outline' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = 'ghost', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      ghost: 'text-slate-400 hover:text-white hover:bg-slate-800/50 active:bg-slate-800/80',
      secondary: 'bg-[#0E1420] text-slate-300 hover:text-white hover:bg-[#141C2E] border border-slate-800',
      outline: 'border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/40',
      primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold shadow-md shadow-emerald-500/15',
    };

    const sizes = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
