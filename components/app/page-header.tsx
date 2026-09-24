import React from 'react';

const widths = {
  /** Settings — short forms and read-only detail. */
  narrow: 'max-w-2xl',
  /** A single focused reading column. */
  focused: 'max-w-3xl',
  /** Studio — wide enough for a long dictated paragraph to breathe. */
  studio: 'max-w-4xl',
  /** History, Favorites — list reading width. */
  default: 'max-w-4xl',
  /** Dashboard, Templates — multi-column workspace. */
  wide: 'max-w-5xl',
} as const;

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: keyof typeof widths;
}

/**
 * Centres page content at a sensible reading width so the workspace never runs
 * edge to edge on a large monitor.
 */
export function PageShell({ width = 'default', className = '', children, ...props }: PageShellProps) {
  return (
    <div
      className={`mx-auto w-full ${widths[width]} px-5 py-8 sm:px-8 sm:py-10 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

/** Consistent title + supporting line used at the top of every workspace page. */
export function PageHeader({ title, description, className = '' }: PageHeaderProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      {description && <p className="text-sm leading-relaxed text-slate-400">{description}</p>}
    </div>
  );
}
