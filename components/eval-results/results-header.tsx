'use client';

import type { EvalResultSummary } from '@/lib/eval-result-types';
import { ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryStatsBar } from './summary-stats-bar';
import { useState, useCallback } from 'react';
import Link from 'next/link';

interface ResultsHeaderProps {
  summary: EvalResultSummary;
  promptfooBaseUrl?: string;
}

function FormattedDate({ dateString }: { dateString: string }) {
  const d = new Date(dateString);
  return (
    <>
      {d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}{' '}
      {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
    </>
  );
}

export function ResultsHeader({ summary, promptfooBaseUrl }: ResultsHeaderProps) {
  const [copied, setCopied] = useState(false);
  const promptfooLink = promptfooBaseUrl
    ? `${promptfooBaseUrl}/eval/${summary.evalId}`
    : null;

  const copyEvalId = useCallback(() => {
    navigator.clipboard.writeText(summary.evalId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [summary.evalId]);

  return (
    <header className="space-y-4 border-b border-border bg-card px-6 py-5">
      {/* Top row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">
            {summary.description || 'Eval Results'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {promptfooLink && (
            <Button variant="outline" size="sm" asChild>
              <a href={promptfooLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open in Promptfoo
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="font-medium">ID:</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {summary.evalId.length > 20
              ? `${summary.evalId.slice(0, 20)}…`
              : summary.evalId}
          </code>
          <button type="button" onClick={copyEvalId} className="text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </span>
        <span>
          <span className="font-medium">Author:</span> {summary.runBy}
        </span>
        <span>
          <span className="font-medium">Date:</span>{' '}
          <FormattedDate dateString={summary.runAt} />
        </span>
        <span>
          <span className="font-medium">Providers:</span> {summary.providerCount}
        </span>
        <span>
          <span className="font-medium">Tests:</span> {summary.totalTests}
        </span>
      </div>

      {/* Stats */}
      <SummaryStatsBar summary={summary} />
    </header>
  );
}
