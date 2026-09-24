import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, disabled, id, 'aria-describedby': describedBy, ...props }, ref) => {
    // Associating the message with the field means assistive tech reads the
    // reason alongside the input instead of leaving it stranded below.
    const errorId = error && id ? `${id}-error` : undefined;
    const description = [describedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full space-y-1.5">
        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={description}
          className={`w-full p-4 text-base rounded-2xl bg-[#0E1420] text-slate-100 placeholder:text-slate-500 border transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/70 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-800 hover:border-slate-700'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-400 font-medium px-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
