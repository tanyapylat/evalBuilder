'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, X, Clock, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEval } from '@/lib/eval-store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EvalRun } from '@/lib/eval-types';

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

function runEffectiveStatus(run: EvalRun): 'InQueue' | 'InProgress' | 'Complete' | 'Error' {
  if (run.status) return run.status;
  // Legacy sample runs without a status field are treated as Complete.
  return 'Complete';
}

function RunStatusIcon({ run, size = 'normal' }: { run: EvalRun; size?: 'normal' | 'small' }) {
  const status = runEffectiveStatus(run);
  const isPassing = run.passRate >= 50;
  const iconSize = size === 'small' ? 'h-3 w-3' : 'h-3 w-3';
  const containerSize = size === 'small' ? 'h-5 w-5' : 'h-5 w-5';

  if (status === 'InQueue') {
    return (
      <div className={cn('flex items-center justify-center rounded-full bg-muted text-muted-foreground', containerSize)}>
        <Clock className={iconSize} />
      </div>
    );
  }

  if (status === 'InProgress') {
    return (
      <div className={cn('flex items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300', containerSize)}>
        <Loader2 className={cn(iconSize, 'animate-spin')} />
      </div>
    );
  }

  if (status === 'Error') {
    return (
      <div className={cn('flex items-center justify-center rounded-full bg-[#E85C41] text-white', containerSize)}>
        <X className={iconSize} />
      </div>
    );
  }

  // Complete
  return isPassing ? (
    <div className={cn('flex items-center justify-center rounded-full bg-[#00BF8F] text-white', containerSize)}>
      <Check className={iconSize} />
    </div>
  ) : (
    <div className={cn('flex items-center justify-center rounded-full bg-[#E85C41] text-white', containerSize)}>
      <X className={iconSize} />
    </div>
  );
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
            const status = runEffectiveStatus(run);
            return (
              <Tooltip key={run.id}>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 items-center justify-center">
                    <RunStatusIcon run={run} size="small" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {run.configName}
                  {status === 'Complete' ? ` — ${run.passRate}%` : ` — ${status}`}
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
        <h2 className="truncate text-base font-medium text-foreground">Evaluation Runs</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-1 p-2">
          {evalRuns.map((run) => {
            const status = runEffectiveStatus(run);
            const isPassing = run.passRate >= 50;
            const promptfooLink =
              status === 'Complete' && run.evalId && run.promptfooBaseUrl
                ? `${run.promptfooBaseUrl}/eval/${run.evalId}`
                : null;

            const content = (
              <div className="flex items-start gap-2 rounded-md px-3 py-2.5 hover:bg-muted w-full">
                <div className="mt-0.5 shrink-0">
                  <RunStatusIcon run={run} />
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-foreground">{run.configName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      <FormattedDate dateString={run.runAt} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    {status === 'Complete' ? (
                      <span className={cn('truncate text-sm', isPassing ? 'text-[#009E76]' : 'text-[#D5391A]')}>
                        Passed: {run.passRate}%
                      </span>
                    ) : status === 'Error' ? (
                      <span className="truncate text-sm text-destructive">
                        {run.errorMessage ?? 'Error'}
                      </span>
                    ) : (
                      <span className="truncate text-sm text-muted-foreground">
                        {status === 'InQueue' ? 'In queue…' : 'Running…'}
                      </span>
                    )}
                    {status === 'Complete' && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {run.passedCount}/{run.totalCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="truncate text-xs text-muted-foreground">{run.runBy}</span>
                    {promptfooLink && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={promptfooLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="left">View in Promptfoo</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            );

            return <div key={run.id}>{content}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
