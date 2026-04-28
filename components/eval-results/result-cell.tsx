'use client';

import type { ProviderOutput } from '@/lib/eval-result-types';
import { cn } from '@/lib/utils';
import { PassFailBadge } from './pass-fail-badge';
import { OutputPreview } from './output-preview';
import { MetricsRow } from './metrics-row';
import { Badge } from '@/components/ui/badge';

interface ResultCellProps {
  output: ProviderOutput;
  onClick: () => void;
  className?: string;
}

export function ResultCell({ output, onClick, className }: ResultCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full cursor-pointer rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50',
        output.status === 'fail' && 'border-red-200 dark:border-red-800/50',
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <PassFailBadge status={output.status} />
        {Object.entries(output.namedScores).map(([name, score]) => (
          <Badge key={name} variant="secondary" className="text-[11px]">
            {name} {score.toFixed(2)}
          </Badge>
        ))}
      </div>

      <OutputPreview rawOutput={output.rawOutput} maxLines={3} className="mb-2" />

      <MetricsRow metadata={output.metadata} />
    </button>
  );
}
