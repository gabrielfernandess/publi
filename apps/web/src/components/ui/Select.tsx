'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string };

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, className, children, ...rest },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink-700">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900',
          'transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
          'disabled:bg-ink-50 disabled:text-ink-400',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
