'use client';

import type { TestCaseResult, ProviderOutput } from '@/lib/eval-result-types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PassFailBadge } from './pass-fail-badge';
import { AssertionResultsTable } from './assertion-results-table';
import { MetricsRow } from './metrics-row';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';

interface ResultDetailDrawerProps {
  testCase: TestCaseResult | null;
  outputIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatOutput(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function PromptAndOutputTab({ output, vars }: { output: ProviderOutput; vars: Record<string, string> }) {
  return (
    <div className="space-y-6 p-4">
      {/* Prompt / Variables */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Prompt Variables</h3>
        <div className="space-y-2">
          {Object.entries(vars).map(([key, value]) => (
            <div key={key}>
              <span className="text-xs font-medium text-muted-foreground">{key}</span>
              <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {value}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Original Output */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Original Output</h3>
          <CopyButton text={output.rawOutput} />
        </div>
        <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {formatOutput(output.rawOutput)}
        </pre>
      </section>
    </div>
  );
}

function EvaluationTab({ output }: { output: ProviderOutput }) {
  return (
    <div className="space-y-6 p-4">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Assertions</h3>
        <AssertionResultsTable assertions={output.assertions} />
      </section>
    </div>
  );
}

function MetadataTab({ output }: { output: ProviderOutput }) {
  const m = output.metadata;
  const rows: [string, string][] = [
    ['Prompt Tokens', m.tokensPrompt.toLocaleString()],
    ['Completion Tokens', m.tokensCompletion.toLocaleString()],
    ['Total Tokens', m.tokensTotal.toLocaleString()],
    ['Latency', `${m.latencyMs.toLocaleString()} ms`],
    ['Tokens/Sec', m.tokensPerSecond.toLocaleString()],
    ['Cost', `$${m.cost.toFixed(6)}`],
    ['Provider', output.providerId],
    ['Status', output.status.toUpperCase()],
    ['Score', output.score.toFixed(2)],
    ['Grader Reason', output.graderReason],
  ];

  return (
    <div className="p-4">
      <div className="rounded-md border border-border">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-start gap-4 px-4 py-2.5 text-sm ${i < rows.length - 1 ? 'border-b border-border' : ''}`}
          >
            <span className="w-36 shrink-0 font-medium text-muted-foreground">{label}</span>
            <span className="text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultDetailDrawer({
  testCase,
  outputIndex,
  open,
  onOpenChange,
}: ResultDetailDrawerProps) {
  if (!testCase) return null;

  const output = testCase.outputs[outputIndex];
  if (!output) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>Test Case #{testCase.testIndex + 1}</span>
            <PassFailBadge status={output.status} />
          </SheetTitle>
          <SheetDescription>
            Details: {output.providerId}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="prompt-output" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4">
            <TabsTrigger value="prompt-output">Prompt & Output</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="prompt-output">
              <PromptAndOutputTab output={output} vars={testCase.vars} />
            </TabsContent>
            <TabsContent value="evaluation">
              <EvaluationTab output={output} />
            </TabsContent>
            <TabsContent value="metadata">
              <MetadataTab output={output} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
