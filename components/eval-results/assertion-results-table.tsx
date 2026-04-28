'use client';

import type { AssertionResult } from '@/lib/eval-result-types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import { ScoreDisplay } from './score-display';
import { cn } from '@/lib/utils';

interface AssertionResultsTableProps {
  assertions: AssertionResult[];
  className?: string;
}

export function AssertionResultsTable({ assertions, className }: AssertionResultsTableProps) {
  if (assertions.length === 0) {
    return <p className="text-sm text-muted-foreground">No assertions evaluated.</p>;
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead className="w-14 text-center">Pass</TableHead>
          <TableHead className="w-16 text-center">Score</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assertions.map((a, i) => (
          <TableRow key={i}>
            <TableCell className="font-medium whitespace-normal">{a.metric}</TableCell>
            <TableCell className="text-center">
              {a.pass ? (
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 p-1 dark:bg-emerald-900/40">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-1 dark:bg-red-900/40">
                  <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" strokeWidth={3} />
                </span>
              )}
            </TableCell>
            <TableCell className="text-center">
              <ScoreDisplay score={a.score} />
            </TableCell>
            <TableCell>
              <span className={cn(
                'inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium',
                'bg-muted text-muted-foreground',
              )}>
                {a.type}
              </span>
            </TableCell>
            <TableCell className="max-w-[280px] whitespace-normal text-xs">{a.value}</TableCell>
            <TableCell className="max-w-[280px] whitespace-normal text-xs">{a.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
