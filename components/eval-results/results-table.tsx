'use client';

import type { TestCaseResult, EvalResultSummary } from '@/lib/eval-result-types';
import { VariablePreview } from './variable-preview';
import { ResultCell } from './result-cell';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ResultsTableProps {
  results: TestCaseResult[];
  summary: EvalResultSummary;
  onCellClick: (testId: string, outputIndex: number) => void;
}

function ColumnHeader({
  providerId,
  prompt,
  passRate,
  passed,
  total,
}: {
  providerId: string;
  prompt: { promptId: number | string; versionId: number | string };
  passRate: number;
  passed: number;
  total: number;
}) {
  const color =
    passRate >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : passRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-1 px-1 pb-3">
      <div className="truncate text-sm font-medium text-foreground">{providerId}</div>
      <div className="truncate text-xs text-muted-foreground">
        {JSON.stringify(prompt)}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-semibold tabular-nums', color)}>
          {passRate.toFixed(2)}% passing
        </span>
        <Badge variant="outline" className="text-[10px]">
          {passed}/{total} cases
        </Badge>
      </div>
    </div>
  );
}

export function ResultsTable({ results, summary, onCellClick }: ResultsTableProps) {
  const providerCount = summary.promptIds.length || 1;

  const passedByProvider = new Array(providerCount).fill(0);
  for (const r of results) {
    r.outputs.forEach((o, i) => {
      if (o.status === 'pass') passedByProvider[i]++;
    });
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Column headers */}
      <div
        className="sticky top-0 z-10 grid gap-4 border-b border-border bg-card px-6 pt-4"
        style={{ gridTemplateColumns: `minmax(280px, 1fr) repeat(${providerCount}, minmax(340px, 2fr))` }}
      >
        <div className="pb-3 text-sm font-semibold text-foreground">Variables</div>
        {summary.promptIds.map((p, i) => (
          <ColumnHeader
            key={i}
            providerId={results[0]?.outputs[i]?.providerId ?? 'Provider'}
            prompt={p}
            passRate={
              results.length > 0
                ? Math.round((passedByProvider[i] / results.length) * 10000) / 100
                : 0
            }
            passed={passedByProvider[i]}
            total={results.length}
          />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {results.map((tc) => (
          <div
            key={tc.id}
            className="grid gap-4 px-6 py-4"
            style={{ gridTemplateColumns: `minmax(280px, 1fr) repeat(${providerCount}, minmax(340px, 2fr))` }}
          >
            <VariablePreview vars={tc.vars} />
            {tc.outputs.map((output, oi) => (
              <ResultCell
                key={oi}
                output={output}
                onClick={() => onCellClick(tc.id, oi)}
              />
            ))}
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          No results match your filter.
        </div>
      )}
    </div>
  );
}
