'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  side?: 'right' | 'left';
}

const widths = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-4xl',
};

export function Drawer({ open, onClose, title, description, children, footer, width = 'lg', side = 'right' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-white shadow-2xl flex flex-col h-full overflow-hidden',
          widths[width],
          side === 'right' ? 'ml-auto animate-slide-in-right' : 'mr-auto animate-slide-in-left',
        )}
      >
        <div className="px-6 py-4 border-b border-ink-100 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink-900 truncate">{title}</h2>
            {description && <p className="text-sm text-ink-500 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors p-1 -m-1 rounded flex-shrink-0" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-ink-100 bg-ink-50/50 flex items-center justify-end gap-3 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
