'use client';

import { useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useEval } from '@/lib/eval-store';
import { usePromptCatalog } from '@/lib/prompt-catalog';
import { usePromptDrafts } from '@/lib/prompt-drafts-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Trash2,
  Edit2,
  Link,
  Sparkles,
  RefreshCw,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateId } from '@/lib/yaml-utils';
import {
  DEFAULT_VENDOR,
  DEFAULT_MODEL,
  type TestCase,
} from '@/lib/eval-types';
import { ModelSettingsFields, type ModelSettingsValues } from '@/components/eval/model-settings-fields';
import { cn } from '@/lib/utils';

// ─── TestCase editor (for manual add/edit) ───────────────────────────────────

function TestCaseEditor({
  testCase,
  promptVariables,
  onSave,
  onCancel,
}: {
  testCase: TestCase | null;
  promptVariables?: string[];
  onSave: (testCase: TestCase) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(testCase?.description || '');
  const defaultVars = useMemo(() => {
    if (testCase?.vars) {
      return Object.entries(testCase.vars).map(([key, value]) => ({ key, value }));
    }
    if (promptVariables && promptVariables.length > 0) {
      return promptVariables.map((v) => ({ key: v, value: '' }));
    }
    return [{ key: 'user_message', value: '' }];
  }, [testCase, promptVariables]);
  const [variables, setVariables] = useState<Array<{ key: string; value: string }>>(defaultVars);

  const addVariable = () => {
    setVariables([...variables, { key: '', value: '' }]);
  };

  const updateVariable = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...variables];
    newVars[index][field] = value;
    setVariables(newVars);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const vars: Record<string, string> = {};
    variables.forEach(({ key, value }) => {
      if (key.trim()) {
        vars[key.trim()] = value;
      }
    });

    onSave({
      id: testCase?.id || generateId(),
      description: description || undefined,
      vars,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="testDescription" className="text-xs font-medium text-muted-foreground">
          Description (optional)
        </Label>
        <Input
          id="testDescription"
          placeholder="Describe this test case..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Variables</Label>
        {variables.map((variable, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Variable name"
              value={variable.key}
              onChange={(e) => updateVariable(index, 'key', e.target.value)}
              className="w-40"
            />
            <Textarea
              placeholder="Value (supports multiline)"
              value={variable.value}
              onChange={(e) => updateVariable(index, 'value', e.target.value)}
              className="flex-1 min-h-10"
              rows={2}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeVariable(index)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addVariable}>
          <Plus className="mr-2 h-4 w-4" />
          Add Variable
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {testCase ? 'Update' : 'Add'} Test Case
        </Button>
      </div>
    </div>
  );
}

// ─── Generation settings panel ───────────────────────────────────────────────

function GenerationSettings({
  onGenerate,
  isGenerating,
  mode,
  defaultExampleKey,
}: {
  onGenerate: (opts: { count: number; vendor: string; model: string; temperature: number; maxTokens: number; examples: Record<string, string>[] }) => void;
  isGenerating: boolean;
  mode: 'initial' | 'additional' | 'regenerate';
  defaultExampleKey?: string;
}) {
  const [count, setCount] = useState(5);
  const [modelSettings, setModelSettings] = useState<ModelSettingsValues>({
    vendor: DEFAULT_VENDOR,
    model: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 30000,
  });
  const [examples, setExamples] = useState<Record<string, string>[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [newExampleKey, setNewExampleKey] = useState(defaultExampleKey || 'user_message');
  const [newExampleValue, setNewExampleValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addExample = () => {
    if (!newExampleValue.trim()) return;
    if (examples.length >= 10) {
      toast.warning('Maximum 10 examples allowed.');
      return;
    }
    setExamples([...examples, { [newExampleKey || 'user_message']: newExampleValue }]);
    setNewExampleValue('');
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length === 0) {
          toast.error('File is empty.');
          return;
        }

        const ext = file.name.toLowerCase().split('.').pop();
        let parsed: Record<string, string>[] = [];

        if (ext === 'json') {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            parsed = json.slice(0, 10).map((item: unknown) => {
              if (typeof item === 'string') return { user_message: item };
              if (typeof item === 'object' && item !== null) {
                const obj: Record<string, string> = {};
                for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
                  obj[k] = String(v);
                }
                return obj;
              }
              return { user_message: String(item) };
            });
          }
        } else {
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
          for (let i = 1; i < Math.min(lines.length, 11); i++) {
            const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx] ?? '';
            });
            parsed.push(row);
          }
        }

        if (parsed.length === 0) {
          toast.error('Could not parse examples from file.');
          return;
        }

        const remaining = 10 - examples.length;
        const toAdd = parsed.slice(0, remaining);
        setExamples([...examples, ...toAdd]);
        toast.success(`Added ${toAdd.length} example${toAdd.length === 1 ? '' : 's'} from file.`);
      } catch {
        toast.error('Failed to parse file. Ensure it is valid JSON or CSV.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = () => {
    onGenerate({ count, ...modelSettings, examples });
  };

  const buttonLabel = mode === 'regenerate'
    ? 'Regenerate All'
    : mode === 'additional'
      ? `Generate ${count} More`
      : `Generate ${count} Test${count === 1 ? '' : 's'}`;

  const buttonIcon = mode === 'regenerate'
    ? <RefreshCw className="mr-2 h-4 w-4" />
    : <Sparkles className="mr-2 h-4 w-4" />;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Number of test cases
        </Label>
        <div className="flex items-center gap-3 max-w-xs">
          <Slider
            min={1}
            max={10}
            step={1}
            value={[count]}
            onValueChange={([v]) => setCount(v)}
            className="flex-1"
          />
          <span className="w-6 text-center text-sm font-medium tabular-nums">{count}</span>
        </div>
      </div>

      <ModelSettingsFields value={modelSettings} onChange={setModelSettings} />

      {/* Examples section */}
      <Collapsible open={showExamples} onOpenChange={setShowExamples}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-xs text-muted-foreground">
            {showExamples ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Examples ({examples.length}/10)
            {examples.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                {examples.length}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            Provide up to 10 examples to guide the style, domain, and complexity of generated tests.
          </p>

          {examples.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-auto">
              {examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded border border-border bg-muted/30 px-3 py-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    {Object.entries(ex).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="font-mono text-muted-foreground">{k}:</span>{' '}
                        <span className="text-foreground">{v.substring(0, 120)}{v.length > 120 ? '...' : ''}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeExample(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {examples.length < 10 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Variable name"
                  value={newExampleKey}
                  onChange={(e) => setNewExampleKey(e.target.value)}
                  className="w-32 text-xs"
                />
                <Textarea
                  placeholder="Example value..."
                  value={newExampleValue}
                  onChange={(e) => setNewExampleValue(e.target.value)}
                  className="flex-1 min-h-8 text-xs"
                  rows={2}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addExample}
                  disabled={!newExampleValue.trim()}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload examples (JSON/CSV)
                </Button>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
        {isGenerating ? (
          'Generating...'
        ) : (
          <>
            {buttonIcon}
            {buttonLabel}
          </>
        )}
      </Button>
    </div>
  );
}

// ─── CSV URL dialog ──────────────────────────────────────────────────────────

function CsvImportDialog({ onSetUrl }: {
  onSetUrl: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [csvUrl, setCsvUrl] = useState('');

  const handleImport = () => {
    if (csvUrl) {
      onSetUrl(csvUrl);
      setOpen(false);
      setCsvUrl('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="mr-2 h-4 w-4" />
          Add CSV file link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add CSV File Link</DialogTitle>
          <DialogDescription>
            Link to an external CSV dataset for your test cases
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label className="text-xs font-medium text-muted-foreground">Dataset URL</Label>
          <Input
            placeholder="https://example.sharepoint.com/...csv"
            value={csvUrl}
            onChange={(e) => setCsvUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The URL will be referenced directly in the YAML config. The dataset will be fetched at runtime.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!csvUrl}
          >
            Use URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main DatasetSection ─────────────────────────────────────────────────────

export function DatasetSection() {
  const {
    config,
    addTest,
    batchAddTests,
    updateTest,
    deleteTest,
    deleteTestsByIds,
    deleteAllTests,
    replaceAllTests,
    setTestsUrl,
  } = useEval();
  const { loadPromptVersionContent, getPromptVersionContent } = usePromptCatalog();
  const { getLivePromptContent } = usePromptDrafts();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [generateMode, setGenerateMode] = useState<'initial' | 'additional' | 'regenerate'>('initial');
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const isUrlDataset = typeof config.tests === 'string';
  const tests = isUrlDataset ? [] : (config.tests as TestCase[]);
  const hasTests = tests.length > 0;

  // Extract variable names from all configured prompts ({{...}} placeholders).
  const promptVariables = useMemo(() => {
    return Array.from(
      new Set(
        config.prompts.flatMap((p) => {
          const live = getLivePromptContent(p);
          if (live) return live.variables;
          return getPromptVersionContent(p.promptId, p.versionId).variables;
        }),
      ),
    );
  }, [config.prompts, getLivePromptContent, getPromptVersionContent]);

  // Prompt variables take priority; any extra keys from existing tests are appended.
  const allKeys = useMemo(() => {
    const fromTests = tests.flatMap((t) => Object.keys(t.vars));
    return Array.from(new Set([...promptVariables, ...fromTests]));
  }, [promptVariables, tests]);

  const allSelected = hasTests && selectedIds.size === tests.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tests.map((t) => t.id)));
    }
  };

  const handleDeleteSelected = () => {
    deleteTestsByIds(selectedIds);
    setSelectedIds(new Set());
    toast.success(`Deleted ${selectedIds.size} test case${selectedIds.size === 1 ? '' : 's'}`);
  };

  const handleDeleteAll = () => {
    deleteAllTests();
    setSelectedIds(new Set());
    setConfirmDeleteAll(false);
    toast.success('All test cases deleted');
  };

  const handleSave = (testCase: TestCase) => {
    if (editingIndex !== null) {
      updateTest(editingIndex, testCase);
      setEditingIndex(null);
    } else {
      addTest(testCase);
      setIsAddingNew(false);
    }
  };

  const handleSetUrl = (url: string) => {
    setTestsUrl(url);
  };

  const handleClearUrl = () => {
    setTestsUrl('');
  };

  const handleGenerate = async (opts: { count: number; vendor: string; model: string; temperature: number; maxTokens: number; examples: Record<string, string>[] }) => {
    if (config.prompts.length === 0) {
      toast.error('Add at least one prompt in Prompt Source first.');
      return;
    }

    setIsGenerating(true);
    try {
      const promptsPayload = await Promise.all(
        config.prompts.map(async (p) => {
          const live = getLivePromptContent(p);
          if (live) return { label: p.label, content: live };
          try {
            const content = await loadPromptVersionContent(p.promptId, p.versionId);
            return { label: p.label, content };
          } catch {
            return { label: p.label, content: getPromptVersionContent(p.promptId, p.versionId) };
          }
        }),
      );

      const allVariables = Array.from(
        new Set(promptsPayload.flatMap((p) => p.content.variables)),
      );

      const res = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: promptsPayload,
          existingAssertions: config.defaultTest.assert.map((a) => ({
            type: a.type,
            metric: a.metric,
            value: a.value,
          })),
          variables: allVariables,
          count: opts.count,
          vendor: opts.vendor,
          model: opts.model,
          examples: opts.examples.length > 0 ? opts.examples : undefined,
        }),
      });

      const data = (await res.json()) as {
        testCases?: Array<{
          title: string;
          category: string;
          variables: Record<string, string>;
          expected_focus: string;
        }>;
        error?: string;
      };

      if (!res.ok || !data.testCases) {
        throw new Error(data.error ?? 'Test generation failed');
      }

      if (data.testCases.length === 0) {
        toast.warning('No test cases were returned. Check your prompt or try again.');
        return;
      }

      const newTests: TestCase[] = data.testCases.map((tc) => ({
        id: generateId(),
        description: tc.title,
        vars: tc.variables,
      }));

      if (generateMode === 'regenerate') {
        replaceAllTests(newTests);
        toast.success(`Regenerated ${newTests.length} test case${newTests.length === 1 ? '' : 's'}`);
      } else {
        batchAddTests(newTests);
        toast.success(`Added ${newTests.length} test case${newTests.length === 1 ? '' : 's'}`);
      }

      setSelectedIds(new Set());
      setShowGeneratePanel(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Test generation failed: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const openGeneratePanel = (mode: 'initial' | 'additional' | 'regenerate') => {
    setGenerateMode(mode);
    setShowGeneratePanel(true);
  };

  return (
    <>
      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all test cases?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {tests.length} test case{tests.length === 1 ? '' : 's'}. This cannot be undone.
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

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">Dataset / Tests</h2>
          <div className="flex gap-2">
            {hasTests ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openGeneratePanel('additional')}
                  disabled={isUrlDataset}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate More
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openGeneratePanel('regenerate')}
                  disabled={isUrlDataset}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openGeneratePanel('initial')}
                disabled={isUrlDataset}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Tests
              </Button>
            )}
            <CsvImportDialog onSetUrl={handleSetUrl} />
            {!isUrlDataset && (
              <Button size="sm" onClick={() => setIsAddingNew(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Test
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3">
          {/* Generation settings panel */}
          {showGeneratePanel && !isUrlDataset && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {generateMode === 'regenerate'
                    ? 'Regenerate Tests'
                    : generateMode === 'additional'
                      ? 'Generate Additional Tests'
                      : 'Generate Tests'}
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowGeneratePanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {generateMode === 'regenerate' && hasTests && (
                <p className="text-xs text-destructive mb-3">
                  This will replace all {tests.length} existing test case{tests.length === 1 ? '' : 's'}.
                </p>
              )}
              <GenerationSettings
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                mode={generateMode}
                defaultExampleKey={promptVariables[0]}
              />
            </div>
          )}

          {isUrlDataset ? (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Dataset URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={config.tests as string}
                  onChange={(e) => setTestsUrl(e.target.value)}
                  placeholder="https://example.com/dataset.csv"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={handleClearUrl}
                  title="Remove CSV link"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The URL will be referenced directly in the YAML config. The dataset will be fetched at runtime.
              </p>
            </div>
          ) : (
            <>
              {isAddingNew && (
                <div className="mb-6 rounded-lg border border-border p-4">
                  <h4 className="mb-4 text-sm font-medium text-foreground">New Test Case</h4>
                  <TestCaseEditor
                    testCase={null}
                    promptVariables={promptVariables}
                    onSave={handleSave}
                    onCancel={() => setIsAddingNew(false)}
                  />
                </div>
              )}

              {tests.length === 0 && !isAddingNew && !showGeneratePanel ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    No test cases defined. Generate tests or add them manually.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={() => openGeneratePanel('initial')}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Tests
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAddingNew(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Manually
                    </Button>
                  </div>
                </div>
              ) : tests.length > 0 ? (
                <>
                  {/* Bulk actions bar */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {someSelected && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {selectedIds.size} selected
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={handleDeleteSelected}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete Selected
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {tests.length} test case{tests.length === 1 ? '' : 's'}
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

                  <div className="overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </TableHead>
                          <TableHead className="w-12">#</TableHead>
                          {allKeys.map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                          <TableHead className="w-24 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tests.map((test, index) => (
                          editingIndex === index ? (
                            <TableRow key={test.id}>
                              <TableCell colSpan={allKeys.length + 3}>
                                <TestCaseEditor
                                  testCase={test}
                                  onSave={handleSave}
                                  onCancel={() => setEditingIndex(null)}
                                />
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow
                              key={test.id}
                              className={cn(selectedIds.has(test.id) && 'bg-primary/5')}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.has(test.id)}
                                  onCheckedChange={() => toggleSelect(test.id)}
                                  aria-label={`Select test ${index + 1}`}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {index + 1}
                              </TableCell>
                              {allKeys.map((key) => (
                                <TableCell key={key} className="max-w-xs">
                                  <span className="line-clamp-2 text-sm">
                                    {test.vars[key] || '-'}
                                  </span>
                                </TableCell>
                              ))}
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingIndex(index)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteTest(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
