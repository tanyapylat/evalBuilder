'use client';

import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle } from 'lucide-react';

interface PassFailBadgeProps {
  status: 'pass' | 'fail' | 'error';
  className?: string;
}

export function PassFailBadge({ status, className }: PassFailBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold uppercase',
        status === 'pass' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        status === 'fail' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        status === 'error' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        className,
      )}
    >
      {status === 'pass' && <Check className="h-3 w-3" strokeWidth={3} />}
      {status === 'fail' && <X className="h-3 w-3" strokeWidth={3} />}
      {status === 'error' && <AlertTriangle className="h-3 w-3" />}
      {status}
    </span>
  );
}
