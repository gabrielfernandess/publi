import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

interface Props {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: { delta: number; label: string };
  accent?: 'navy' | 'brand' | 'gold' | 'accent' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md';
  className?: string;
}

const accents = {
  navy: 'bg-brand-50 text-brand-700',  // alias para brand
  brand: 'bg-brand-50 text-brand-700',
  gold: 'bg-accent-50 text-accent-700',  // alias para accent
  accent: 'bg-accent-50 text-accent-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};

export function StatCard({ icon, label, value, hint, trend, accent = 'navy', size = 'md', className }: Props) {
  const valueClass = size === 'sm' ? 'text-lg' : 'text-2xl';
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">{label}</p>
          <p className={cn('mt-2 font-bold text-ink-900 truncate', valueClass)}>{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', trend.delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {trend.delta >= 0 ? '↑' : '↓'} {Math.abs(trend.delta)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0', accents[accent])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
