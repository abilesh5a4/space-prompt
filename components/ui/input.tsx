import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full h-11 px-4 text-sm rounded-xl bg-[#0E1420] text-slate-100 placeholder:text-slate-500 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/70 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-800 hover:border-slate-700'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium px-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
