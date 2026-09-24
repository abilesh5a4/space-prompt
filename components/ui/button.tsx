import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer rounded-xl';

    const variants = {
      primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:bg-emerald-600 font-semibold shadow-md shadow-emerald-500/15 border border-emerald-400/20',
      secondary: 'bg-[#121A2A] text-slate-100 hover:bg-[#1A253C] active:bg-[#0E1420] border border-slate-800/80 shadow-sm',
      outline: 'border border-slate-700/80 text-slate-200 hover:bg-slate-800/50 active:bg-slate-800/80 hover:border-slate-600',
      ghost: 'text-slate-300 hover:bg-slate-800/40 hover:text-white active:bg-slate-800/70',
      danger: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 active:bg-red-500/35',
    };

    const sizes = {
      sm: 'h-9 px-3.5 text-xs gap-1.5',
      md: 'h-11 px-5 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
      icon: 'h-10 w-10 p-0 text-slate-300 hover:text-white',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            {size !== 'icon' && <span>Loading...</span>}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
