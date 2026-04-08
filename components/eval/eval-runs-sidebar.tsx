'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEval } from '@/lib/eval-store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FormattedDate({ dateString }: { dateString: string }) {
  const [formatted, setFormatted] = useState<string>('');

  useEffect(() => {
    setFormatted(formatDate(dateString));
  }, [dateString]);

  if (!formatted) return null;
  
  return <>{formatted}</>;
}

interface EvalRunsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function EvalRunsSidebar({ collapsed, onToggle }: EvalRunsSidebarProps) {
  const { evalRuns } = useEval();

  if (collapsed) {
    return (
      <div className="flex h-full flex-col border-l border-border bg-card">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="m-2"
              onClick={onToggle}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Expand Evaluation Runs</TooltipContent>
        </Tooltip>
        
        <div className="flex-1 flex flex-col items-center gap-1 py-2">
          {evalRuns.slice(0, 8).map((run) => {
            const isPassing = run.passRate >= 50;
            const hasResults = run.totalCount > 0;
            
            return (
              <Tooltip key={run.id}>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 items-center justify-center">
                    {hasResults ? (
                      isPassing ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                          <X className="h-3 w-3" />
                        </div>
                      )
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Clock className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {run.configName} - {run.passRate}%
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggle}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="truncate text-lg font-semibold text-foreground">Evaluation Runs</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-1 p-2">
          {evalRuns.map((run) => {
            const isPassing = run.passRate >= 50;
            const hasResults = run.totalCount > 0;
            
            return (
              <div
                key={run.id}
                className="flex items-start gap-2 rounded-md px-3 py-2.5 hover:bg-muted"
              >
                <div className="mt-0.5 shrink-0">
                  {hasResults ? (
                    isPassing ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                        <X className="h-3 w-3" />
                      </div>
                    )
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Clock className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-foreground">{run.configName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      <FormattedDate dateString={run.runAt} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    {hasResults ? (
                      <span className={cn(
                        'truncate text-sm',
                        isPassing ? 'text-accent' : 'text-destructive'
                      )}>
                        Passed: {run.passRate}%
                      </span>
                    ) : (
                      <span className="truncate text-sm text-muted-foreground">No results</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {run.passedCount}/{run.totalCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="truncate text-xs text-muted-foreground">{run.runBy}</span>
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
