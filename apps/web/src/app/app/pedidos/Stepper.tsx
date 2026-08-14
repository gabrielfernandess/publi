'use client';

import { Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LIST } from './constants';

type Props = {
  currentId: string;
  onSelect?: (id: string) => void;
};

export function Stepper({ currentId, onSelect }: Props) {
  const currentIdx = STATUS_LIST.findIndex((s) => s.id === currentId);
  return (
    <div className="-mx-1 px-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_LIST.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isNext = i === currentIdx + 1;
          const isLocked = i > currentIdx + 1; // futuras travadas
          const clickable = (onSelect && !isLocked);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => clickable && onSelect?.(s.id)}
              disabled={isLocked}
              className={cn(
                'group inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                isCurrent && 'bg-brand-50 text-brand-800 ring-2 ring-brand-300',
                isPast && 'text-emerald-700 hover:bg-emerald-50 cursor-pointer',
                isNext && 'text-brand-600 hover:bg-brand-50/50 cursor-pointer ring-1 ring-brand-200',
                isLocked && 'text-ink-400 opacity-50 cursor-not-allowed',
                isPast && onSelect && 'cursor-pointer',
              )}
              title={isLocked ? 'Salve a etapa atual antes de avançar' : s.label}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 transition-colors',
                isCurrent && 'bg-brand-600 text-white',
                isPast && 'bg-emerald-500 text-white',
                isNext && 'bg-brand-100 text-brand-700 ring-1 ring-brand-300',
                isLocked && 'bg-ink-100 text-ink-400',
              )}>
                {isLocked ? <Lock className="w-3 h-3" /> : isPast ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
              </span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
