'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  X,
  Search,
  Bot,
  RefreshCw,
  HelpCircle,
  Code2,
  Loader2,
  Edit2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useEval } from '@/lib/eval-store';
import { usePromptCatalog } from '@/lib/prompt-catalog';
import { usePromptDrafts } from '@/lib/prompt-drafts-context';
import {
  DETERMINISTIC_ASSERTIONS,
  LLM_ASSERTIONS,
  ASSERTION_INFO,
  ASSERTION_CATEGORIES,
  DEFAULT_VENDOR,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  vendorModelId,
  parseVendorModelId,
  REQUIREMENT_CATEGORIES,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STRATEGIES,
  type Assertion,
  type AssertionType,
  type EvalConfig,
  type JudgeProviderConfig,
  type Requirement,
  type RequirementCategory,
  type RequirementPriority,
  type RequirementAssertionStrategy,
} from '@/lib/eval-types';

const GENERATABLE_ASSERTION_TYPES: AssertionType[] = [
  ...DETERMINISTIC_ASSERTIONS.filter((t) => t !== 'javascript' && t !== 'python'),
  ...LLM_ASSERTIONS,
];
import { ModelSettingsFields, type ModelSettingsValues } from '@/components/eval/model-settings-fields';
import { CodeAssertionEditor } from '@/components/eval/code-assertion-editor';
import { generateId } from '@/lib/yaml-utils';
import { cn } from '@/lib/utils';
import { type AssertionSuggestion } from '@/lib/ai-assistance';
import { AssertionAdvisor } from '@/components/eval/assertion-advisor';

// ─── Type helpers ─────────────────────────────────────────────────────────────

const ARRAY_TYPES: AssertionType[] = [
  'contains-all',
  'contains-any',
  'icontains-all',
  'icontains-any',
  'not-contains-all',
  'not-contains-any',
  'not-icontains-any',
];
const NUMERIC_TYPES: AssertionType[] = ['cost', 'latency', 'levenshtein'];
const CODE_TYPES: AssertionType[] = ['javascript', 'python'];
const NO_VALUE_TYPES: AssertionType[] = [
  'is-json',
  'contains-json',
  'model-graded-factuality',
  'model-graded-closedqa',
  'answer-relevance',
];

const isArrayType = (t: AssertionType) => ARRAY_TYPES.includes(t);
const isNumericType = (t: AssertionType) => NUMERIC_TYPES.includes(t);
const isCodeType = (t: AssertionType) => CODE_TYPES.includes(t);
const isWordCountType = (t: AssertionType) => t === 'wordCount';
const isNoValueType = (t: AssertionType) => NO_VALUE_TYPES.includes(t);

// ─── Short value preview for collapsed header ─────────────────────────────────

function getValuePreview(a: Assertion): string {
  if (isNoValueType(a.type)) return '';
  if (isCodeType(a.type)) {
    const code = String(a.value ?? '').trim();
    if (!code) return '(empty)';
    const firstLine = code.split('\n').find((l) => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('#'));
    return firstLine ? (firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine) : code.slice(0, 50) + '…';
  }
  if (a.type === 'wordCount') {
    try {
      const p = JSON.parse(String(a.value)) as { min?: number; max?: number };
      const parts: string[] = [];
      if (p.min !== undefined) parts.push(`min ${p.min}`);
      if (p.max !== undefined) parts.push(`max ${p.max}`);
      return parts.join(', ');
    } catch {
      return String(a.value ?? '');
    }
  }
  if (Array.isArray(a.value)) {
    const preview = a.value.slice(0, 2).join(', ');
    return a.value.length > 2 ? `${preview} +${a.value.length - 2} more` : preview;
  }
  const str = String(a.value ?? '');
  return str.length > 60 ? str.slice(0, 60) + '…' : str;
}

// ─── Array tag builder ────────────────────────────────────────────────────────

function ArrayValueEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState('');

  const addItem = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputVal('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="min-h-9 flex flex-wrap gap-1.5 rounded-md border border-input bg-transparent px-3 py-2">
        {value.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground self-center">
            No items yet — add below
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Type an item and press Enter"
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={!inputVal.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

// ─── Word count min/max editor ────────────────────────────────────────────────

function WordCountEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  let parsed: { min?: number; max?: number } = {};
  try {
    parsed = JSON.parse(value) as { min?: number; max?: number };
  } catch { /* empty */ }

  const update = (min?: number, max?: number) =>
    onChange(
      JSON.stringify({
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      }),
    );

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Label className="text-xs font-medium text-muted-foreground">Min words</Label>
        <Input
          type="number"
          min={0}
          value={parsed.min ?? ''}
          onChange={(e) =>
            update(e.target.value ? parseInt(e.target.value) : undefined, parsed.max)
          }
          placeholder="0"
          className="mt-1.5 h-9"
        />
      </div>
      <div className="flex-1">
        <Label className="text-xs font-medium text-muted-foreground">Max words</Label>
        <Input
          type="number"
          min={0}
          value={parsed.max ?? ''}
          onChange={(e) =>
            update(parsed.min, e.target.value ? parseInt(e.target.value) : undefined)
          }
          placeholder="unlimited"
          className="mt-1.5 h-9"
        />
      </div>
    </div>
  );
}

// ─── Judge model settings ─────────────────────────────────────────────────────

function JudgeSettings({
  assertion,
  onUpdate,
}: {
  assertion: Assertion;
  onUpdate: (a: Assertion) => void;
}) {
  const provider: JudgeProviderConfig = assertion.provider ?? {
    id: vendorModelId(DEFAULT_VENDOR, DEFAULT_MODEL),
    config: { max_tokens: 30000, temperature: DEFAULT_TEMPERATURE },
  };

  const { vendor, model } = parseVendorModelId(provider.id);

  const handleChange = (v: ModelSettingsValues) => {
    onUpdate({
      ...assertion,
      provider: {
        id: vendorModelId(v.vendor, v.model),
        config: { ...provider.config, temperature: v.temperature, max_tokens: v.maxTokens },
      },
    });
  };

  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">
        Judge Model Settings
      </div>
      <ModelSettingsFields
        value={{
          vendor,
          model,
          temperature: provider.config.temperature,
          maxTokens: provider.config.max_tokens,
        }}
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Inline assertion editor ──────────────────────────────────────────────────

interface AssertionEditorProps {
  assertion: Assertion;
  index: number;
  isNew?: boolean;
  bulkToggle: { id: number; expanded: boolean };
  selected: boolean;
  onToggleSelect: () => void;
  onUpdate: (assertion: Assertion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function AssertionEditor({
  assertion,
  index,
  isNew,
  bulkToggle,
  selected,
  onToggleSelect,
  onUpdate,
  onDelete,
  onDuplicate,
}: AssertionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!isNew);
  const containerRef = useRef<HTMLDivElement>(null);
  const metricInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsExpanded(bulkToggle.expanded);
  }, [bulkToggle.id]);

  useEffect(() => {
    if (isNew) {
      setIsExpanded(true);
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const t = setTimeout(() => metricInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isNew]);

  const isLlm = LLM_ASSERTIONS.includes(assertion.type);
  const isCode = isCodeType(assertion.type);
  const info = ASSERTION_INFO[assertion.type];
  const preview = getValuePreview(assertion);

  const categoryLabel = isLlm ? 'LLM' : isCode ? 'Code' : 'Deterministic';
  const categoryColor = isLlm
    ? { border: 'border-violet-500/30 ring-violet-500/10', left: 'border-l-violet-500', badge: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400' }
    : isCode
      ? { border: 'border-blue-500/30 ring-blue-500/10', left: 'border-l-blue-500', badge: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400' }
      : { border: 'border-emerald-500/30 ring-emerald-500/10', left: 'border-l-emerald-500', badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' };

  // ── Assertion type change ───────────────────────────────────────────────────
  const handleTypeChange = (newType: AssertionType) => {
    const wasArray = isArrayType(assertion.type);
    const willBeArray = isArrayType(newType);
    const willBeNoValue = isNoValueType(newType);
    const willBeCode = isCodeType(newType);
    const wasCode = isCodeType(assertion.type);
    onUpdate({
      ...assertion,
      type: newType,
      value: willBeNoValue
        ? ''
        : willBeCode && !wasCode
          ? ''
          : wasCode && !willBeCode
            ? ''
            : wasArray && !willBeArray
              ? ''
              : !wasArray && willBeArray
                ? []
                : assertion.value,
    });
  };

  // ── Deterministic categories (exclude LLM as Judge and Custom Code) ────────
  const deterministicCategories = Object.entries(ASSERTION_CATEGORIES).filter(
    ([cat]) => cat !== 'LLM as Judge' && cat !== 'Custom Code',
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        ref={containerRef}
        className={cn(
          'rounded-lg border bg-card overflow-hidden',
          categoryColor.border,
          'ring-1',
          selected && 'ring-2 ring-primary/30 bg-primary/[0.02]',
        )}
      >

        {/* ── Collapsed header / trigger ── */}
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50',
              'border-l-[3px]',
              categoryColor.left,
            )}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect()}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select assertion ${index + 1}`}
              className="shrink-0"
            />
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />

            <div className="flex flex-1 items-center gap-2 min-w-0">
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-xs font-normal',
                  categoryColor.badge,
                )}
              >
                {categoryLabel}
              </Badge>
              <span className="text-sm font-medium">{assertion.type}</span>
              {assertion.metric && (
                <span className="truncate text-xs text-muted-foreground">
                  · {assertion.metric}
                </span>
              )}
              {!isExpanded && preview && (
                <span className="truncate text-xs text-muted-foreground">
                  — {preview}
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                title="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {isExpanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </div>
        </CollapsibleTrigger>

        {/* ── Expanded form ── */}
        <CollapsibleContent>
          <div className={cn(
            'border-t border-border p-4 space-y-4',
            'border-l-[3px]',
            categoryColor.left,
          )}>

            {/* Metric name */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Metric Name{' '}
                <span className="font-normal">(optional)</span>
              </Label>
              <Input
                ref={metricInputRef}
                value={assertion.metric ?? ''}
                onChange={(e) =>
                  onUpdate({ ...assertion, metric: e.target.value || undefined })
                }
                placeholder="e.g., SL tone, Brevity score"
                className="mt-1.5"
              />
            </div>

            {/* ── Deterministic fields ── */}
            {!isLlm && !isCode && (
              <>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Assertion Type</Label>
                  <Select
                    value={assertion.type}
                    onValueChange={(v) => handleTypeChange(v as AssertionType)}
                  >
                    <SelectTrigger className="mt-1.5 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {deterministicCategories.map(([cat, types]) => (
                        <SelectGroup key={cat}>
                          <SelectLabel>{cat}</SelectLabel>
                          {types.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>

                  {info && (
                    <Alert className="mt-2 border-muted bg-muted/40 px-3 py-2">
                      <Info className="h-3.5 w-3.5" />
                      <AlertDescription className="text-xs">
                        <span className="font-medium text-foreground">
                          {info.description}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}· {info.whenToUse}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {!isNoValueType(assertion.type) && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {isArrayType(assertion.type)
                        ? 'Values'
                        : isWordCountType(assertion.type)
                          ? 'Word Count Range'
                          : 'Value'}
                    </Label>

                    {isArrayType(assertion.type) ? (
                      <div className="mt-1.5">
                        <ArrayValueEditor
                          value={Array.isArray(assertion.value) ? assertion.value : []}
                          onChange={(v) => onUpdate({ ...assertion, value: v })}
                        />
                      </div>
                    ) : isWordCountType(assertion.type) ? (
                      <div className="mt-1.5">
                        <WordCountEditor
                          value={typeof assertion.value === 'string' ? assertion.value : ''}
                          onChange={(v) => onUpdate({ ...assertion, value: v })}
                        />
                      </div>
                    ) : isNumericType(assertion.type) ? (
                      <Input
                        type="number"
                        value={
                          typeof assertion.value === 'number'
                            ? assertion.value
                            : typeof assertion.value === 'string'
                              ? assertion.value
                              : ''
                        }
                        onChange={(e) =>
                          onUpdate({
                            ...assertion,
                            value: e.target.value
                              ? parseFloat(e.target.value)
                              : ('' as unknown as number),
                          })
                        }
                        placeholder="Enter threshold value"
                        className="mt-1.5"
                      />
                    ) : (
                      <Textarea
                        value={
                          typeof assertion.value === 'string'
                            ? assertion.value
                            : String(assertion.value ?? '')
                        }
                        onChange={(e) =>
                          onUpdate({ ...assertion, value: e.target.value })
                        }
                        placeholder={info?.example ?? 'Enter expected value…'}
                        className="mt-1.5 min-h-[80px] font-mono text-sm"
                      />
                    )}
                  </div>
                )}

                {assertion.type === 'similar' && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      Similarity Threshold{' '}
                      <span className="font-normal">(0 – 1)</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={assertion.threshold ?? 0.8}
                      onChange={(e) =>
                        onUpdate({ ...assertion, threshold: parseFloat(e.target.value) })
                      }
                      className="mt-1.5 w-32"
                    />
                  </div>
                )}
              </>
            )}

            {/* ── Custom Code (JavaScript / Python) fields ── */}
            {isCode && (
              <>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Language</Label>
                  <Select
                    value={assertion.type}
                    onValueChange={(v) => handleTypeChange(v as AssertionType)}
                  >
                    <SelectTrigger className="mt-1.5 h-9 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Validation Code
                  </Label>
                  <Alert className="mt-1.5 mb-2 border-muted bg-muted/40 px-3 py-2">
                    <Info className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">
                      {assertion.type === 'python' ? (
                        <>
                          <span className="font-medium text-foreground">
                            Variables: <code className="rounded bg-background px-1">output</code> (LLM response string), <code className="rounded bg-background px-1">context</code> (dict with prompt, vars, test, config).
                          </span>
                          <span className="text-muted-foreground">
                            {' '}Return <code className="rounded bg-background px-1">True/False</code>, a <code className="rounded bg-background px-1">float</code> score, or a dict with <code className="rounded bg-background px-1">pass</code>/<code className="rounded bg-background px-1">score</code>/<code className="rounded bg-background px-1">reason</code>.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-foreground">
                            Variables: <code className="rounded bg-background px-1">output</code> (LLM response string), <code className="rounded bg-background px-1">context</code> (object with prompt, vars, test).
                          </span>
                          <span className="text-muted-foreground">
                            {' '}Return <code className="rounded bg-background px-1">true/false</code>, a numeric score, or a <code className="rounded bg-background px-1">{'{ pass, score, reason }'}</code> object.
                          </span>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div className="mt-1.5">
                    <CodeAssertionEditor
                      language={assertion.type === 'python' ? 'python' : 'javascript'}
                      value={typeof assertion.value === 'string' ? assertion.value : String(assertion.value ?? '')}
                      onChange={(v) => onUpdate({ ...assertion, value: v })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Score Threshold{' '}
                    <span className="font-normal">(optional, 0 – 1)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                    If your code returns a numeric score, values at or above this threshold pass.
                  </p>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={assertion.threshold ?? ''}
                    onChange={(e) =>
                      onUpdate({
                        ...assertion,
                        threshold: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g. 0.5"
                    className="w-32"
                  />
                </div>
              </>
            )}

            {/* ── LLM as Judge fields ── */}
            {isLlm && (
              <>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Judge Type</Label>
                  <Select
                    value={assertion.type}
                    onValueChange={(v) => handleTypeChange(v as AssertionType)}
                  >
                    <SelectTrigger className="mt-1.5 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(ASSERTION_CATEGORIES['LLM as Judge'] ?? []).map((t) => (
                        <SelectItem key={t} value={t}>
                          <div className="flex flex-col">
                            <span>{t}</span>
                            {ASSERTION_INFO[t] && (
                              <span className="text-xs text-muted-foreground">
                                {ASSERTION_INFO[t].description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isNoValueType(assertion.type) && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      Rubric / Instructions
                    </Label>
                    <Textarea
                      value={
                        typeof assertion.value === 'string'
                          ? assertion.value
                          : String(assertion.value ?? '')
                      }
                      onChange={(e) =>
                        onUpdate({ ...assertion, value: e.target.value })
                      }
                      placeholder={'Describe what the LLM judge should check.\n\nExample: "PASS only if the response is friendly, professional, and directly addresses the user\'s question."'}
                      className="mt-1.5 min-h-[120px]"
                    />
                  </div>
                )}

                <JudgeSettings assertion={assertion} onUpdate={onUpdate} />
              </>
            )}

          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─── Generate Assertions Dialog ───────────────────────────────────────────────

function buildTestsSummary(tests: EvalConfig['tests']): string | undefined {
  if (typeof tests === 'string') {
    return tests.trim() ? `External dataset URL or path: ${tests}` : undefined;
  }
  if (tests.length === 0) return undefined;
  return JSON.stringify(
    tests.map((t) => ({
      description: t.description,
      vars: t.vars,
    })),
    null,
    2,
  );
}

function assertionsFromSuggestions(suggestions: AssertionSuggestion[]): Assertion[] {
  return suggestions.map((s) => {
    const isLlmJudge = LLM_ASSERTIONS.includes(s.assertionType);
    return {
      id: generateId(),
      type: s.assertionType,
      metric: s.metric,
      value: s.value,
      ...(isLlmJudge
        ? {
            provider: {
              id: vendorModelId(DEFAULT_VENDOR, DEFAULT_MODEL),
              config: { max_tokens: 30000, temperature: DEFAULT_TEMPERATURE },
            },
          }
        : {}),
    };
  });
}

const CATEGORY_COLORS: Record<RequirementCategory, string> = {
  structure: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  constraint: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
  tone: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  correctness: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  format: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  safety: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  content: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  behavior: 'border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

const STRATEGY_LABELS: Record<RequirementAssertionStrategy, { label: string; color: string }> = {
  deterministic: { label: 'deterministic', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  code: { label: 'code', color: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  'llm-judge': { label: 'llm judge', color: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  'none-yet': { label: 'skip', color: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground' },
};

type WizardStep = 'extracting' | 'review' | 'generating';

function getAssertionTypesForStrategy(strategy: RequirementAssertionStrategy): AssertionType[] {
  switch (strategy) {
    case 'deterministic':
      return DETERMINISTIC_ASSERTIONS.filter((t) => t !== 'javascript' && t !== 'python');
    case 'code':
      return ['javascript', 'python'] as AssertionType[];
    case 'llm-judge':
      return [...LLM_ASSERTIONS];
    default:
      return GENERATABLE_ASSERTION_TYPES;
  }
}

function RequirementRow({
  requirement,
  onUpdate,
  onDelete,
}: {
  requirement: Requirement;
  onUpdate: (r: Requirement) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(requirement.text);

  const saveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed) {
      onUpdate({ ...requirement, text: trimmed });
    }
    setIsEditing(false);
  };

  const colorClass = CATEGORY_COLORS[requirement.category] || CATEGORY_COLORS.behavior;
  const strategyInfo = STRATEGY_LABELS[requirement.assertionStrategy] || STRATEGY_LABELS['llm-judge'];
  const isExcluded = !requirement.included;
  const availableTypes = getAssertionTypesForStrategy(requirement.assertionStrategy);

  return (
    <div className={cn(
      'flex items-start gap-2 rounded-lg border bg-card p-3',
      isExcluded ? 'border-dashed border-muted-foreground/20 opacity-50' : 'border-border',
    )}>
      <Checkbox
        checked={requirement.included}
        onCheckedChange={(checked) => onUpdate({ ...requirement, included: !!checked })}
        aria-label={`Include requirement: ${requirement.text.slice(0, 40)}`}
        className="mt-1 shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('shrink-0 text-[10px] font-normal', colorClass)}>
            {requirement.category}
          </Badge>
          <Badge variant="outline" className={cn('shrink-0 text-[10px] font-normal', strategyInfo.color)}>
            {strategyInfo.label}
          </Badge>
          {requirement.source === 'manual' && (
            <Badge variant="outline" className="shrink-0 text-[10px] font-normal border-muted-foreground/30 text-muted-foreground">
              manual
            </Badge>
          )}
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[60px] text-sm"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
              }}
            />
            <div className="flex flex-col gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setIsEditing(false); setEditText(requirement.text); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <p className={cn('text-sm', isExcluded ? 'text-muted-foreground line-through' : 'text-foreground')}>
            {requirement.text}
          </p>
        )}
        {!isEditing && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Select
              value={requirement.assertionStrategy}
              onValueChange={(v) => {
                const newStrategy = v as RequirementAssertionStrategy;
                const newTypes = getAssertionTypesForStrategy(newStrategy);
                const currentType = requirement.recommendedAssertionType;
                const typeStillValid = currentType && newTypes.includes(currentType);
                onUpdate({
                  ...requirement,
                  assertionStrategy: newStrategy,
                  recommendedAssertionType: typeStillValid ? currentType : newTypes[0],
                  included: newStrategy !== 'none-yet' ? requirement.included : false,
                });
              }}
            >
              <SelectTrigger className="h-6 w-[110px] text-[10px] border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUIREMENT_STRATEGIES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {requirement.assertionStrategy !== 'none-yet' && (
              <Select
                value={requirement.recommendedAssertionType ?? availableTypes[0] ?? ''}
                onValueChange={(v) => onUpdate({ ...requirement, recommendedAssertionType: v as AssertionType })}
              >
                <SelectTrigger className="h-6 w-[140px] text-[10px] border-dashed">
                  <SelectValue placeholder="assertion type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>
      {!isEditing && (
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => { setEditText(requirement.text); setIsEditing(true); }}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AddRequirementForm({ onAdd }: { onAdd: (r: Omit<Requirement, 'id'>) => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<RequirementCategory>('behavior');
  const [strategy, setStrategy] = useState<RequirementAssertionStrategy>('llm-judge');

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({
      text: trimmed,
      category,
      priority: 'important',
      assertionStrategy: strategy,
      recommendedAssertionType: strategy === 'deterministic' ? 'contains' : strategy === 'code' ? 'javascript' : strategy === 'llm-judge' ? 'llm-rubric' : undefined,
      included: strategy !== 'none-yet',
      source: 'manual',
    });
    setText('');
  };

  return (
    <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a requirement manually..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="flex-1 min-h-[60px] text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={(v) => setCategory(v as RequirementCategory)}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUIREMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={strategy} onValueChange={(v) => setStrategy(v as RequirementAssertionStrategy)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUIREMENT_STRATEGIES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={!text.trim()} className="h-8">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

function GenerateAssertionsDialog({
  open,
  onOpenChange,
  onAccept,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (assertions: Assertion[], mode: 'add' | 'replace') => void;
  mode: 'generate' | 'additional' | 'regenerate';
}) {
  const { config } = useEval();
  const { loadPromptVersionContent } = usePromptCatalog();
  const { getLivePromptContent } = usePromptDrafts();

  const [step, setStep] = useState<WizardStep>('extracting');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const [confirmReExtract, setConfirmReExtract] = useState(false);
  const [postGenAction, setPostGenAction] = useState<'replace' | 'append'>('replace');

  const hasExistingAssertions = config.defaultTest.assert.length > 0;

  const resolvePrompts = useCallback(async () => {
    return Promise.all(
      config.prompts.map(async (p) => {
        const live = getLivePromptContent(p);
        const content =
          live ?? (await loadPromptVersionContent(p.promptId, p.versionId));
        return { label: p.label, content };
      }),
    );
  }, [config.prompts, getLivePromptContent, loadPromptVersionContent]);

  const parseExtractedRequirements = (
    data: Array<{
      text: string;
      category: string;
      priority?: string;
      assertionStrategy?: string;
      recommendedAssertionType?: string;
    }>,
  ): Requirement[] =>
    data.map((r) => {
      const strategy = (REQUIREMENT_STRATEGIES as readonly string[]).includes(r.assertionStrategy ?? '')
        ? (r.assertionStrategy as RequirementAssertionStrategy)
        : 'llm-judge';
      const recType = r.recommendedAssertionType && GENERATABLE_ASSERTION_TYPES.includes(r.recommendedAssertionType as AssertionType)
        ? (r.recommendedAssertionType as AssertionType)
        : strategy === 'deterministic' ? 'contains' : strategy === 'code' ? 'javascript' : 'llm-rubric';
      return {
        id: generateId(),
        text: r.text,
        category: (REQUIREMENT_CATEGORIES as readonly string[]).includes(r.category)
          ? (r.category as RequirementCategory)
          : 'behavior',
        priority: (REQUIREMENT_PRIORITIES as readonly string[]).includes(r.priority ?? '')
          ? (r.priority as RequirementPriority)
          : 'important',
        assertionStrategy: strategy,
        recommendedAssertionType: strategy !== 'none-yet' ? recType : undefined,
        included: strategy !== 'none-yet',
        source: 'extracted' as const,
      };
    });

  const startExtraction = useCallback(async () => {
    if (config.prompts.length === 0) {
      toast.error('Add at least one prompt in Prompt Source first.');
      return;
    }

    setStep('extracting');
    setError(null);
    try {
      const promptsPayload = await resolvePrompts();

      const res = await fetch('/api/extract-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: promptsPayload }),
      });

      const data = (await res.json()) as {
        requirements?: Array<{
          text: string;
          category: string;
          priority?: string;
          assertionStrategy?: string;
          recommendedAssertionType?: string;
        }>;
        error?: string;
      };

      if (!res.ok || !data.requirements) {
        throw new Error(data.error ?? 'Requirement extraction failed');
      }

      if (data.requirements.length === 0) {
        toast.warning('No requirements could be extracted. Try a different prompt.');
        setStep('review');
        return;
      }

      setRequirements(parseExtractedRequirements(data.requirements));
      setUserHasEdited(false);
      setStep('review');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setStep('review');
    }
  }, [config.prompts, resolvePrompts]);

  const handleReExtract = () => {
    if (userHasEdited) {
      setConfirmReExtract(true);
    } else {
      startExtraction();
    }
  };

  useEffect(() => {
    if (open) {
      setRequirements([]);
      setError(null);
      setUserHasEdited(false);
      setPostGenAction(mode === 'regenerate' ? 'replace' : hasExistingAssertions ? 'append' : 'replace');
      startExtraction();
    }
  }, [open, startExtraction]);

  const handleUpdateRequirement = (id: string, updated: Requirement) => {
    setRequirements((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setUserHasEdited(true);
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
    setUserHasEdited(true);
  };

  const handleAddRequirement = (r: Omit<Requirement, 'id'>) => {
    setRequirements((prev) => [...prev, { ...r, id: generateId() }]);
    setUserHasEdited(true);
  };

  const includedRequirements = requirements.filter((r) => r.included);

  const handleGenerateAssertions = async () => {
    if (includedRequirements.length === 0) {
      toast.error('Include at least one requirement before generating assertions.');
      return;
    }

    setStep('generating');
    setError(null);
    try {
      const promptsPayload = await resolvePrompts();

      const existingAssertions = postGenAction === 'replace'
        ? []
        : config.defaultTest.assert.map((a) => ({
            type: a.type,
            metric: a.metric,
            value: a.value,
          }));

      const res = await fetch('/api/generate-assertions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: promptsPayload,
          existingAssertions,
          requirements: includedRequirements.map((r) => ({
            text: r.text,
            category: r.category,
            priority: r.priority,
            assertionStrategy: r.assertionStrategy,
            recommendedAssertionType: r.recommendedAssertionType,
          })),
          testsSummary: buildTestsSummary(config.tests),
        }),
      });

      const data = (await res.json()) as {
        suggestions?: Array<
          Omit<AssertionSuggestion, 'id'> & { assertionType: string }
        >;
        error?: string;
      };

      if (!res.ok || !data.suggestions) {
        throw new Error(data.error ?? 'Assertion generation failed');
      }

      if (data.suggestions.length === 0) {
        toast.warning('No assertions were returned. Try adjusting your requirements.');
        setStep('review');
        return;
      }

      const withIds: AssertionSuggestion[] = data.suggestions.map((s) => ({
        id: generateId(),
        type: s.type,
        assertionType: s.assertionType as AssertionSuggestion['assertionType'],
        metric: s.metric,
        value: s.value,
        explanation: s.explanation,
      }));

      const added = assertionsFromSuggestions(withIds);
      onAccept(added, postGenAction === 'replace' ? 'replace' : 'add');
      const verb = postGenAction === 'replace' ? 'Replaced with' : 'Added';
      toast.success(`${verb} ${added.length} assertion${added.length === 1 ? '' : 's'} from ${includedRequirements.length} requirement${includedRequirements.length === 1 ? '' : 's'}`);
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message);
      setStep('review');
    }
  };

  const title = mode === 'regenerate'
    ? 'Regenerate Assertions'
    : mode === 'additional'
      ? 'Generate Additional Assertions'
      : 'Generate Assertions';

  const ButtonIcon = mode === 'regenerate' ? RefreshCw : Sparkles;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            onOpenChange(false);
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ButtonIcon className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>
              {step === 'extracting'
                ? 'Analyzing your prompt to extract testable requirements...'
                : step === 'review'
                  ? 'Review, edit, or add requirements. Assertions will be generated from included requirements.'
                  : 'Generating assertions from your confirmed requirements...'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <span className={cn('font-medium', step === 'extracting' && 'text-primary')}>
              1. Extract
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className={cn('font-medium', step === 'review' && 'text-primary')}>
              2. Review
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className={cn('font-medium', step === 'generating' && 'text-primary')}>
              3. Generate
            </span>
          </div>

          <div className="flex-1 overflow-auto py-2">
            {/* Step 1: Extracting */}
            {step === 'extracting' && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing prompt to extract requirements...
                </p>
              </div>
            )}

            {/* Step 2: Review requirements */}
            {step === 'review' && (
              <div className="space-y-4 px-1">
                {error && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <Info className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-sm text-destructive">
                      {error} — You can still add requirements manually below.
                    </AlertDescription>
                  </Alert>
                )}

                {requirements.length > 0 && (() => {
                  const includedCount = includedRequirements.length;
                  const excludedCount = requirements.length - includedCount;

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {requirements.length} requirement{requirements.length === 1 ? '' : 's'}
                          {excludedCount > 0 && (
                            <span className="text-muted-foreground/70">
                              {' '}({excludedCount} excluded)
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => {
                              setRequirements((prev) => prev.map((r) => ({ ...r, included: true })));
                              setUserHasEdited(true);
                            }}
                          >
                            Include all
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => {
                              setRequirements((prev) => prev.map((r) => ({ ...r, included: false })));
                              setUserHasEdited(true);
                            }}
                          >
                            Exclude all
                          </Button>
                        </div>
                      </div>
                      {includedCount > 0 && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                          Assertions will be generated for {includedCount} included requirement{includedCount === 1 ? '' : 's'}.
                          {' '}Use the checkbox to include or skip each requirement. Adjust the assertion type recommendation with the rightmost dropdown.
                        </p>
                      )}
                      {includedCount === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                          No requirements are included. Check at least one requirement to generate assertions.
                        </p>
                      )}
                      <div className="space-y-2">
                        {requirements.map((r) => (
                          <RequirementRow
                            key={r.id}
                            requirement={r}
                            onUpdate={(updated) => handleUpdateRequirement(r.id, updated)}
                            onDelete={() => handleDeleteRequirement(r.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {requirements.length === 0 && !error && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No requirements extracted. Add some manually below.
                  </p>
                )}

                <AddRequirementForm onAdd={handleAddRequirement} />

                {hasExistingAssertions && (
                  <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      Existing assertions:
                    </span>
                    <Select
                      value={postGenAction}
                      onValueChange={(v) => setPostGenAction(v as 'replace' | 'append')}
                    >
                      <SelectTrigger className="h-7 w-[180px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="replace" className="text-xs">Replace all</SelectItem>
                        <SelectItem value="append" className="text-xs">Append new assertions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Generating assertions from {includedRequirements.length} requirement{includedRequirements.length === 1 ? '' : 's'}...
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          {step === 'review' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleReExtract}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-extract
              </Button>
              <Button
                onClick={handleGenerateAssertions}
                disabled={includedRequirements.length === 0}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Confirm &amp; Generate
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReExtract} onOpenChange={setConfirmReExtract}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-extract requirements?</AlertDialogTitle>
            <AlertDialogDescription>
              You have modified the extracted requirements. Re-extracting will replace all current requirements with a fresh extraction from the prompt. Your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep My Edits</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmReExtract(false); startExtraction(); }}>
              Re-extract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Add Assertion Popover ────────────────────────────────────────────────────

function AddAssertionPopover({
  onAdd,
  onOpenAdvisor,
}: {
  onAdd: (type: 'deterministic' | 'llm' | 'code') => void;
  onOpenAdvisor: () => void;
}) {
  const [open, setOpen] = useState(false);

  const choose = (type: 'deterministic' | 'llm' | 'code') => {
    onAdd(type);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Assertion
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <p className="px-2 pb-1.5 pt-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Add Assertion
        </p>
        <button
          className="w-full flex items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted transition-colors"
          onClick={() => choose('deterministic')}
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
            <Search className="h-3.5 w-3.5 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">Deterministic</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exact match, keywords, formatting
            </p>
          </div>
        </button>
        <button
          className="w-full flex items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted transition-colors"
          onClick={() => choose('llm')}
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/5">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">LLM as Judge</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tone, quality, subjective checks
            </p>
          </div>
        </button>
        <button
          className="w-full flex items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted transition-colors"
          onClick={() => choose('code')}
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/5">
            <Code2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">Custom Code</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              JavaScript or Python validation
            </p>
          </div>
        </button>
        <div className="mx-2 my-1.5 border-t border-border" />
        <button
          className="w-full flex items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted transition-colors"
          onClick={() => { onOpenAdvisor(); setOpen(false); }}
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/5">
            <HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">Help Me Choose</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Not sure which type? Take a quick quiz
            </p>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ─── AssertionsSection ────────────────────────────────────────────────────────

export function AssertionsSection() {
  const { config, addAssertion, updateAssertion, deleteAssertion, duplicateAssertion, replaceAllAssertions, deleteAssertionsByIds, deleteAllAssertions } =
    useEval();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMode, setGenerateMode] = useState<'generate' | 'additional' | 'regenerate'>('generate');
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [newAssertionId, setNewAssertionId] = useState<string | null>(null);
  const [bulkToggle, setBulkToggle] = useState({ id: 0, expanded: true });
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const assertions = config.defaultTest.assert;
  const hasAssertions = assertions.length > 0;
  const allSelected = hasAssertions && selectedIds.size === assertions.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assertions.map((a) => a.id)));
    }
  };

  const handleDeleteSelected = () => {
    deleteAssertionsByIds(selectedIds);
    toast.success(`Deleted ${selectedIds.size} assertion${selectedIds.size === 1 ? '' : 's'}`);
    setSelectedIds(new Set());
  };

  const handleDeleteAll = () => {
    deleteAllAssertions();
    setSelectedIds(new Set());
    setConfirmDeleteAll(false);
    toast.success('All assertions deleted');
  };

  const collapseAllAssertions = () =>
    setBulkToggle((t) => ({ id: t.id + 1, expanded: false }));
  const expandAllAssertions = () =>
    setBulkToggle((t) => ({ id: t.id + 1, expanded: true }));

  const confirmDeleteAssertion = () => {
    if (pendingDeleteIndex !== null) {
      deleteAssertion(pendingDeleteIndex);
      setPendingDeleteIndex(null);
    }
  };

  const handleAdd = (type: 'deterministic' | 'llm' | 'code') => {
    const id = generateId();
    if (type === 'llm') {
      addAssertion({
        id,
        type: 'llm-rubric',
        value: '',
        provider: {
          id: vendorModelId(DEFAULT_VENDOR, DEFAULT_MODEL),
          config: { max_tokens: 30000, temperature: DEFAULT_TEMPERATURE },
        },
      });
    } else if (type === 'code') {
      addAssertion({
        id,
        type: 'javascript',
        value: '',
      });
    } else {
      addAssertion({
        id,
        type: 'contains',
        value: '',
      });
    }
    setNewAssertionId(id);
  };

  const handleAcceptGenerated = (assertions: Assertion[], mode: 'add' | 'replace') => {
    if (mode === 'replace') {
      replaceAllAssertions(assertions);
    } else {
      assertions.forEach((a) => addAssertion(a));
    }
  };

  const openGenerate = (mode: 'generate' | 'additional' | 'regenerate') => {
    setGenerateMode(mode);
    setGenerateOpen(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium text-foreground">Assertions</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasAssertions && (
            <div className="flex items-center gap-1 border-r border-border pr-2 mr-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
                onClick={expandAllAssertions}
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Expand all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
                onClick={collapseAllAssertions}
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Collapse all
              </Button>
            </div>
          )}
          {hasAssertions ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openGenerate('additional')}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Generate More
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openGenerate('regenerate')}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openGenerate('generate')}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Generate
            </Button>
          )}
          <AddAssertionPopover onAdd={handleAdd} onOpenAdvisor={() => setAdvisorOpen(true)} />
        </div>
      </div>

      {/* ── Selection toolbar ── */}
      {hasAssertions && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all assertions"
            />
            <span className="text-xs text-muted-foreground">
              {someSelected
                ? `${selectedIds.size} of ${assertions.length} selected`
                : 'Select all'}
            </span>
            {someSelected && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Selected
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {assertions.length} assertion{assertions.length === 1 ? '' : 's'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => setConfirmDeleteAll(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete All
            </Button>
          </div>
        </div>
      )}

      <div className={hasAssertions ? 'mt-2' : 'mt-3'}>
        {assertions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              No assertions yet
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted transition-colors"
                onClick={() => handleAdd('deterministic')}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                  <Search className="h-3.5 w-3.5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Add Deterministic</p>
                  <p className="text-xs text-muted-foreground">
                    Exact match, keywords…
                  </p>
                </div>
              </button>
              <button
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted transition-colors"
                onClick={() => handleAdd('llm')}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Add LLM as Judge</p>
                  <p className="text-xs text-muted-foreground">
                    Tone, quality, subjective…
                  </p>
                </div>
              </button>
              <button
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted transition-colors"
                onClick={() => handleAdd('code')}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/5">
                  <Code2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Add Custom Code</p>
                  <p className="text-xs text-muted-foreground">
                    JavaScript or Python
                  </p>
                </div>
              </button>
            </div>
            <button
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setAdvisorOpen(true)}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Not sure which type? Let us help you decide
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {assertions.map((assertion, index) => (
              <AssertionEditor
                key={assertion.id}
                assertion={assertion}
                index={index}
                isNew={assertion.id === newAssertionId}
                bulkToggle={bulkToggle}
                selected={selectedIds.has(assertion.id)}
                onToggleSelect={() => toggleSelect(assertion.id)}
                onUpdate={(updated) => updateAssertion(index, updated)}
                onDelete={() => setPendingDeleteIndex(index)}
                onDuplicate={() => duplicateAssertion(index)}
              />
            ))}
          </div>
        )}
      </div>

      <GenerateAssertionsDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onAccept={handleAcceptGenerated}
        mode={generateMode}
      />

      <AlertDialog
        open={pendingDeleteIndex !== null}
        onOpenChange={(open) => !open && setPendingDeleteIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assertion?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteIndex !== null &&
              assertions[pendingDeleteIndex] ? (
                <>
                  This removes the{' '}
                  <span className="font-medium text-foreground">
                    {assertions[pendingDeleteIndex].type}
                  </span>
                  {assertions[pendingDeleteIndex].metric
                    ? ` (${assertions[pendingDeleteIndex].metric})`
                    : ''}{' '}
                  assertion. This cannot be undone.
                </>
              ) : (
                'This assertion will be removed. This cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteAssertion}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all assertions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {assertions.length} assertion{assertions.length === 1 ? '' : 's'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAll}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={advisorOpen} onOpenChange={setAdvisorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-500" />
              Which assertion type do you need?
            </DialogTitle>
            <DialogDescription>
              Answer a few quick questions and we&apos;ll recommend the right assertion type for your use case.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <AssertionAdvisor
              onAddAssertion={(type) => {
                handleAdd(type);
                setAdvisorOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
