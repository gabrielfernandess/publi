import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
        {description && <p className="text-sm text-ink-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
