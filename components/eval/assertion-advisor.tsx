'use client';

import { useState, useCallback } from 'react';
import {
  ChevronRight,
  RotateCcw,
  Bot,
  Search,
  Code2,
  ChevronDown,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  type AdvisorResult,
  type QuestionNode,
  getNode,
  getQuestionNumber,
  isResultNode,
  QUESTION_IDS,
} from '@/lib/assertion-advisor-tree';

interface AssertionAdvisorProps {
  onResult?: (result: AdvisorResult) => void;
  onAddAssertion?: (type: 'deterministic' | 'llm' | 'code') => void;
}

const RESULT_STYLES = {
  deterministic: {
    border: 'border-emerald-500/30 bg-emerald-500/5',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    label: 'Deterministic Assertion',
    addLabel: 'Deterministic',
    Icon: Search,
  },
  llm_judge: {
    border: 'border-violet-500/30 bg-violet-500/5',
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    label: 'LLM as Judge Assertion',
    addLabel: 'LLM as Judge',
    Icon: Bot,
  },
  code: {
    border: 'border-blue-500/30 bg-blue-500/5',
    icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    label: 'Custom Code Assertion',
    addLabel: 'Custom Code',
    Icon: Code2,
  },
} as const;

function mapRecommendationToAddType(rec: AdvisorResult['recommendation']): 'deterministic' | 'llm' | 'code' {
  if (rec === 'llm_judge') return 'llm';
  return rec;
}

export function AssertionAdvisor({
  onResult,
  onAddAssertion,
}: AssertionAdvisorProps) {
  const [currentId, setCurrentId] = useState('q1');
  const [history, setHistory] = useState<string[]>([]);

  const node = getNode(currentId);
  const isResult = isResultNode(node);

  const handleAnswer = useCallback(
    (nextId: string) => {
      setHistory((h) => [...h, currentId]);
      setCurrentId(nextId);

      const nextNode = getNode(nextId);
      if (isResultNode(nextNode)) {
        onResult?.(nextNode.result);
      }
    },
    [currentId, onResult],
  );

  const handleBack = useCallback(() => {
    setHistory((h) => {
      const next = [...h];
      const prev = next.pop();
      if (prev) setCurrentId(prev);
      return next;
    });
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentId('q1');
    setHistory([]);
  }, []);

  if (isResult) {
    const { result } = node;
    const style = RESULT_STYLES[result.recommendation];
    const { Icon } = style;

    return (
      <div className="space-y-4">
        {/* Result header */}
        <div className={cn('rounded-lg border p-4', style.border)}>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                style.icon,
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{style.label}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] uppercase tracking-wider font-medium',
                    result.confidence === 'high'
                      ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                  )}
                >
                  {result.confidence} confidence
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {result.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
            {result.recommendation === 'code'
              ? 'Common use cases'
              : 'Suggested assertion types'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.examples.map((ex) => (
              <span
                key={ex}
                className="inline-flex items-center rounded-md bg-background border border-border px-2.5 py-1 text-xs font-mono"
              >
                {ex}
              </span>
            ))}
          </div>
        </div>

        {/* Suggested next step */}
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3.5 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Next step: </span>
            {result.suggestedNextStep}
          </p>
        </div>

        {/* Why this recommendation */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            Why this recommendation?
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                <span className="font-medium text-foreground">Deterministic assertions</span> are
                fastest and most reliable when the output can be checked by exact rules — keyword
                match, regex, JSON structure, or numeric thresholds.
              </p>
              <p>
                <span className="font-medium text-foreground">Custom Code assertions</span> (JavaScript
                or Python) are ideal when you need multi-step logic, data parsing, computed checks, or
                multiple conditions combined — more power than built-in checks but still rule-based.
              </p>
              <p>
                <span className="font-medium text-foreground">LLM-as-Judge assertions</span> are
                best when evaluation requires interpretation, semantic understanding, tone, relevance,
                or when multiple valid outputs may exist.
              </p>
              <p className="pt-1 border-t border-border">
                Many use cases benefit from combining types: e.g. a deterministic check for required
                structure + an LLM judge for quality, or custom code for complex validation + an LLM
                judge for tone.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onAddAssertion && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => onAddAssertion(mapRecommendationToAddType(result.recommendation))}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Add {style.addLabel} Assertion
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRestart}>
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  // Question view
  const questionNode = node as QuestionNode;
  const questionNum = getQuestionNumber(currentId);
  const totalQuestions = QUESTION_IDS.length;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Question {questionNum} of {totalQuestions}
          </span>
          {history.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              onClick={handleBack}
            >
              Back
            </button>
          )}
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${(questionNum / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <h3 className="text-sm font-semibold leading-snug">
          {questionNode.question}
        </h3>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {questionNode.description}
        </p>
      </div>

      {/* Answer buttons */}
      <div className="space-y-2">
        {questionNode.answers.map((answer) => (
          <button
            key={answer.label}
            onClick={() => handleAnswer(answer.nextId)}
            className={cn(
              'group flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3',
              'text-left text-sm font-medium transition-all',
              'hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm',
              'active:scale-[0.98]',
            )}
          >
            {answer.label}
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>

      {/* Start over */}
      {history.length > 0 && (
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleRestart}
        >
          <RotateCcw className="h-3 w-3" />
          Start over
        </button>
      )}
    </div>
  );
}
