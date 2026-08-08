'use client';

import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Rounded = 'md' | 'lg' | 'pill';
type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string; rounded?: Rounded };
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string; rounded?: Rounded };

const baseField =
  'w-full border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ' +
  'disabled:bg-ink-50 disabled:text-ink-400 disabled:cursor-not-allowed';

const roundedMap = { md: 'rounded-md', lg: 'rounded-lg', pill: 'rounded-pill' };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, rounded = 'md', className, ...rest },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink-700">{label}</label>}
      <input ref={ref} className={cn(baseField, roundedMap[rounded], error && 'border-red-400 focus:border-red-500 focus:ring-red-100', className)} {...rest} />
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, rounded = 'md', className, ...rest },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink-700">{label}</label>}
      <textarea ref={ref} className={cn(baseField, roundedMap[rounded], 'min-h-[88px] resize-y', error && 'border-red-400 focus:border-red-500 focus:ring-red-100', className)} {...rest} />
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
