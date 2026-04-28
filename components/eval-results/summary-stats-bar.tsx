'use client';

import type { EvalResultSummary } from '@/lib/eval-result-types';
import { cn } from '@/lib/utils';

interface SummaryStatsBarProps {
  summary: EvalResultSummary;
  className?: string;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-card px-4 py-2.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('text-lg font-bold tabular-nums', accent ?? 'text-foreground')}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function SummaryStatsBar({ summary, className }: SummaryStatsBarProps) {
  const passColor =
    summary.passRate >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : summary.passRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className={cn('flex flex-wrap items-stretch gap-3', className)}>
      <StatCard
        label="Pass Rate"
        value={`${summary.passRate}%`}
        sub={`${summary.passedTests} / ${summary.totalTests}`}
        accent={passColor}
      />
      <StatCard label="Passed" value={String(summary.passedTests)} accent="text-emerald-600 dark:text-emerald-400" />
      <StatCard label="Failed" value={String(summary.failedTests)} accent={summary.failedTests > 0 ? 'text-red-600 dark:text-red-400' : undefined} />
      <StatCard label="Avg Score" value={summary.avgScore.toFixed(2)} />
      <StatCard label="Total Cost" value={`$${summary.totalCost.toFixed(4)}`} />
      <StatCard label="Avg Latency" value={`${summary.avgLatencyMs.toLocaleString()} ms`} />
      <StatCard label="Avg Tokens" value={String(summary.avgTokens)} />
    </div>
  );
}
