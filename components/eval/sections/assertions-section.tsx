'use client';

import { useState, useRef, useEffect } from 'react';
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
  type Assertion,
  type AssertionType,
  type EvalConfig,
  type JudgeProviderConfig,
} from '@/lib/eval-types';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructions, setInstructions] = useState('');

  const handleGenerate = async () => {
    if (config.prompts.length === 0) {
      toast.error('Add at least one prompt in Prompt Source first.');
      return;
    }

    setIsGenerating(true);
    try {
      const promptsPayload = await Promise.all(
        config.prompts.map(async (p) => {
          const live = getLivePromptContent(p);
          const content =
            live ?? (await loadPromptVersionContent(p.promptId, p.versionId));
          return {
            label: p.label,
            content,
          };
        }),
      );

      const existingAssertions = mode === 'regenerate'
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
          testsSummary: buildTestsSummary(config.tests),
          instructions: instructions.trim() || undefined,
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
        toast.warning('No assertions were returned. Check your prompt or try again.');
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
      const resolvedMode = mode === 'regenerate' ? 'replace' : 'add';
      onAccept(added, resolvedMode);
      const verb = mode === 'regenerate' ? 'Regenerated' : 'Added';
      toast.success(`${verb} ${added.length} assertion${added.length === 1 ? '' : 's'}`);
      onOpenChange(false);
      setInstructions('');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetOnClose = () => {
    setInstructions('');
  };

  const title = mode === 'regenerate'
    ? 'Regenerate Assertions'
    : mode === 'additional'
      ? 'Generate Additional Assertions'
      : 'Generate Assertions';

  const description = mode === 'regenerate'
    ? 'Replaces all existing assertions with a fresh set generated from your prompt.'
    : 'Analyzes your Prompt Source text as written (saved or unsaved editor buffer), avoids overlap with existing assertions, and adds 3\u20135 assertions to the list below.';

  const buttonLabel = mode === 'regenerate'
    ? 'Regenerate assertions'
    : 'Generate & add assertions';

  const ButtonIcon = mode === 'regenerate' ? RefreshCw : Sparkles;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetOnClose();
      }}
    >
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ButtonIcon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}{' '}
            Requires <code className="rounded bg-muted px-1 text-xs">OPENAI_API_KEY</code> on the server.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          <div className="space-y-4 px-1 py-2">
            {mode === 'regenerate' && (
              <p className="text-center text-sm text-destructive">
                All existing assertions will be replaced.
              </p>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Optional hints for the generator (tone, constraints, or assertion mix).
            </p>
            <div className="space-y-2">
              <Label htmlFor="assertion-gen-instructions" className="text-xs font-medium text-muted-foreground">
                Generation instructions (optional)
              </Label>
              <Textarea
                id="assertion-gen-instructions"
                placeholder="e.g. One rubric for instruction-following; one contains check for required disclaimer…"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex justify-center pt-1">
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  'Generating…'
                ) : (
                  <>
                    <ButtonIcon className="mr-2 h-4 w-4" />
                    {buttonLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
