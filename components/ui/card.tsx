import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'elevated';
  isSelected?: boolean;
}

export function Card({
  variant = 'default',
  isSelected = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-2xl border transition-all duration-200';

  const variants = {
    default: 'bg-[#0E1420]/80 border-slate-800/80 text-slate-100',
    interactive: `bg-[#0E1420] border-slate-800 hover:border-slate-700 hover:bg-[#121A2A] cursor-pointer text-slate-100 ${
      isSelected ? 'border-emerald-500/60 bg-[#121A2A] glow-card-active ring-1 ring-emerald-500/30' : ''
    }`,
    elevated: 'bg-[#121A2A] border-slate-700/60 shadow-xl shadow-black/40 text-slate-100',
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pb-3 space-y-1.5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-semibold tracking-tight text-slate-100 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-slate-400 font-normal leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pt-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pt-0 flex items-center ${className}`} {...props}>
      {children}
    </div>
  );
}
