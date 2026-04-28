'use client';

import type { OutputMetadata } from '@/lib/eval-result-types';
import { cn } from '@/lib/utils';

interface MetricsRowProps {
  metadata: OutputMetadata;
  className?: string;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function MetricsRow({ metadata, className }: MetricsRowProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <span>
        Tokens: {fmt(metadata.tokensTotal)}{' '}
        <span className="opacity-60">
          ({fmt(metadata.tokensPrompt)}+{fmt(metadata.tokensCompletion)})
        </span>
      </span>
      <span>Latency: {fmt(metadata.latencyMs)} ms</span>
      <span>Tokens/Sec: {fmt(metadata.tokensPerSecond)}</span>
      <span>Cost: ${metadata.cost.toFixed(4)}</span>
    </div>
  );
}
