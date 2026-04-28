'use client';

import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number;
  className?: string;
}

export function ScoreDisplay({ score, className }: ScoreDisplayProps) {
  const pct = score * 100;
  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        pct >= 80 && 'text-emerald-600 dark:text-emerald-400',
        pct >= 50 && pct < 80 && 'text-amber-600 dark:text-amber-400',
        pct < 50 && 'text-red-600 dark:text-red-400',
        className,
      )}
    >
      {score.toFixed(2)}
    </span>
  );
}
