'use client';

import { useState } from 'react';
import { Plus, Trash2, Copy, GripVertical, Info, ChevronDown, ChevronUp, Lightbulb, Sparkles, Wand2, ArrowRightLeft, HelpCircle, Check, X, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useEval } from '@/lib/eval-store';
import { 
  DETERMINISTIC_ASSERTIONS, 
  LLM_ASSERTIONS, 
  ASSERTION_INFO, 
  JUDGE_MODELS,
  type Assertion, 
  type AssertionType,
  type JudgeProviderConfig,
} from '@/lib/eval-types';
import { generateId } from '@/lib/yaml-utils';
import { cn } from '@/lib/utils';
import { 
  generateAssertionSuggestions, 
  improveAssertion, 
  convertAssertion, 
  explainAssertion,
  type AssertionSuggestion,
  type AssertionImprovement,
} from '@/lib/ai-assistance';

// Guidance questions for assertion advisor
const GUIDANCE_QUESTIONS = [
  {
    question: 'Do you know the exact expected output?',
    yesRecommendation: 'deterministic',
    noRecommendation: null,
  },
  {
    question: 'Are you checking for presence or absence of specific terms?',
    yesRecommendation: 'deterministic',
    noRecommendation: null,
  },
  {
    question: 'Are you checking format, length, or structure?',
    yesRecommendation: 'deterministic',
    noRecommendation: null,
  },
  {
    question: 'Are you checking subjective quality like tone, clarity, or helpfulness?',
    yesRecommendation: 'llm',
    noRecommendation: 'deterministic',
  },
];

// AI Action Modal for assertion improvements
function AIActionModal({ 
  open, 
  onOpenChange, 
  title,
  improvement,
  onApply,
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  improvement: AssertionImprovement | null;
  onApply: (assertion: Assertion) => void;
}) {
  if (!improvement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Review the suggested changes before applying
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>{improvement.explanation}</AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Current Version</Label>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-sm font-mono">
                  <div><span className="text-muted-foreground">type:</span> {improvement.original.type}</div>
                  {improvement.original.metric && <div><span className="text-muted-foreground">metric:</span> {improvement.original.metric}</div>}
                  <div className="mt-2 text-xs text-muted-foreground line-clamp-3">
                    {String(improvement.original.value || '').substring(0, 100)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-primary">Suggested Version</Label>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="text-sm font-mono">
                  <div><span className="text-muted-foreground">type:</span> {improvement.suggested.type}</div>
                  {improvement.suggested.metric && <div><span className="text-muted-foreground">metric:</span> {improvement.suggested.metric}</div>}
                  <div className="mt-2 text-xs text-muted-foreground line-clamp-3">
                    {String(improvement.suggested.value || '').substring(0, 100)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => { onApply(improvement.suggested); onOpenChange(false); }}>
            <Check className="mr-2 h-4 w-4" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Explain Modal
function ExplainModal({ 
  open, 
  onOpenChange, 
  explanation,
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Assertion Explanation
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{explanation}</p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AssertionEditorProps {
  assertion: Assertion;
  index: number;
  onUpdate: (assertion: Assertion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function AssertionEditor({ assertion, index, onUpdate, onDelete, onDuplicate }: AssertionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState('');
  const [improvement, setImprovement] = useState<AssertionImprovement | null>(null);
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [explanation, setExplanation] = useState('');
  
  const isLlmAssertion = LLM_ASSERTIONS.includes(assertion.type);
  const info = ASSERTION_INFO[assertion.type];
  const needsArrayValue = ['contains-all', 'contains-any', 'icontains-all', 'icontains-any', 'not-contains-all', 'not-contains-any', 'not-icontains-any'].includes(assertion.type);

  const handleImprove = () => {
    const result = improveAssertion(assertion);
    setImprovement(result);
    setAiModalTitle('Improve Assertion');
    setAiModalOpen(true);
  };

  const handleConvert = () => {
    const result = convertAssertion(assertion);
    setImprovement(result);
    setAiModalTitle(isLlmAssertion ? 'Convert to Deterministic' : 'Convert to LLM');
    setAiModalOpen(true);
  };

  const handleExplain = () => {
    const result = explainAssertion(assertion);
    setExplanation(result);
    setExplainModalOpen(true);
  };

  const handleValueChange = (value: string) => {
    if (needsArrayValue) {
      const arrayValue = value.split('\n').filter(v => v.trim());
      onUpdate({ ...assertion, value: arrayValue });
    } else {
      onUpdate({ ...assertion, value });
    }
  };

  const displayValue = Array.isArray(assertion.value) 
    ? assertion.value.join('\n') 
    : String(assertion.value || '');

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div className="flex-1 flex items-center gap-3">
              <span className={cn(
                'rounded px-2 py-0.5 text-xs font-medium',
                isLlmAssertion 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-accent/10 text-accent-foreground'
              )}>
                {isLlmAssertion ? 'LLM' : 'Deterministic'}
              </span>
              <span className="font-medium text-sm">{assertion.type}</span>
              {assertion.metric && (
                <span className="text-sm text-muted-foreground">({assertion.metric})</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleImprove}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Improve assertion
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleConvert}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Convert to {isLlmAssertion ? 'Deterministic' : 'LLM'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExplain}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Explain
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border p-4 space-y-4">
            {info && (
              <Alert className="bg-muted/50 border-muted">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>What it checks:</strong> {info.description}<br />
                  <strong>When to use:</strong> {info.whenToUse}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Assertion Type</Label>
                <Select
                  value={assertion.type}
                  onValueChange={(value: AssertionType) => onUpdate({ ...assertion, type: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Deterministic</div>
                    {DETERMINISTIC_ASSERTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">LLM as Judge</div>
                    {LLM_ASSERTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Metric Name (Optional)</Label>
                <Input
                  value={assertion.metric || ''}
                  onChange={(e) => onUpdate({ ...assertion, metric: e.target.value || undefined })}
                  placeholder="e.g., SL brevity"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">
                {isLlmAssertion ? 'Rubric / Prompt' : 'Value'}
                {needsArrayValue && ' (one per line)'}
              </Label>
              <Textarea
                value={displayValue}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder={isLlmAssertion 
                  ? 'Enter the rubric or criteria for the LLM judge...'
                  : needsArrayValue 
                    ? 'Enter values, one per line...'
                    : 'Enter the expected value...'
                }
                className="mt-1.5 min-h-24 font-mono text-sm"
              />
            </div>

            {isLlmAssertion && (
              <JudgeSettings assertion={assertion} onUpdate={onUpdate} />
            )}

            {assertion.type === 'similar' && (
              <div>
                <Label className="text-sm font-medium">Similarity Threshold (0-1)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={assertion.threshold || 0.8}
                  onChange={(e) => onUpdate({ ...assertion, threshold: parseFloat(e.target.value) })}
                  className="mt-1.5 w-32"
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>

      <AIActionModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        title={aiModalTitle}
        improvement={improvement}
        onApply={onUpdate}
      />

      <ExplainModal
        open={explainModalOpen}
        onOpenChange={setExplainModalOpen}
        explanation={explanation}
      />
    </Collapsible>
  );
}

function JudgeSettings({ assertion, onUpdate }: { assertion: Assertion; onUpdate: (a: Assertion) => void }) {
  const provider = assertion.provider || {
    id: 'openai:gpt-5-mini-2025-08-07',
    config: { max_tokens: 30000, temperature: 0 },
  };

  const updateProvider = (updates: Partial<JudgeProviderConfig>) => {
    onUpdate({
      ...assertion,
      provider: { ...provider, ...updates } as JudgeProviderConfig,
    });
  };

  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-4">
      <div className="text-sm font-medium text-muted-foreground">Judge Model Settings</div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">Model</Label>
          <Select
            value={provider.id}
            onValueChange={(value) => updateProvider({ id: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JUDGE_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Max Tokens</Label>
          <Input
            type="number"
            value={provider.config.max_tokens}
            onChange={(e) => updateProvider({ 
              config: { ...provider.config, max_tokens: parseInt(e.target.value) || 3000 } 
            })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Temperature</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={provider.config.temperature}
            onChange={(e) => updateProvider({ 
              config: { ...provider.config, temperature: parseFloat(e.target.value) || 0 } 
            })}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}

function AddAssertionDialog({ open, onOpenChange, onAdd }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onAdd: (type: 'deterministic' | 'llm') => void;
}) {
  const [step, setStep] = useState<'choose' | 'advisor' | 'select'>('choose');
  const [advisorIndex, setAdvisorIndex] = useState(0);
  const [recommendation, setRecommendation] = useState<'deterministic' | 'llm' | null>(null);

  const handleChoose = (type: 'deterministic' | 'llm') => {
    onAdd(type);
    onOpenChange(false);
    setStep('choose');
  };

  const handleAdvisorAnswer = (answer: 'yes' | 'no') => {
    const question = GUIDANCE_QUESTIONS[advisorIndex];
    const rec = answer === 'yes' ? question.yesRecommendation : question.noRecommendation;
    
    if (rec) {
      setRecommendation(rec as 'deterministic' | 'llm');
      setStep('select');
    } else if (advisorIndex < GUIDANCE_QUESTIONS.length - 1) {
      setAdvisorIndex(advisorIndex + 1);
    } else {
      setRecommendation('deterministic');
      setStep('select');
    }
  };

  const resetDialog = () => {
    setStep('choose');
    setAdvisorIndex(0);
    setRecommendation(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Assertion</DialogTitle>
          <DialogDescription>
            {step === 'choose' && 'Choose how to add your assertion'}
            {step === 'advisor' && 'Answer a few questions to find the best assertion type'}
            {step === 'select' && 'Select your assertion type'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto p-4"
              onClick={() => handleChoose('deterministic')}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent/10">
                <span className="text-lg">🔍</span>
              </div>
              <div className="text-left">
                <div className="font-medium">Add Deterministic Assertion</div>
                <div className="text-sm text-muted-foreground">
                  For exact matches, contains checks, regex, banned terms, etc.
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto p-4"
              onClick={() => handleChoose('llm')}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                <span className="text-lg">🤖</span>
              </div>
              <div className="text-left">
                <div className="font-medium">Add LLM as Judge</div>
                <div className="text-sm text-muted-foreground">
                  For subjective quality checks (tone, clarity, helpfulness)
                </div>
              </div>
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setStep('advisor')}
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              Not sure? Let me help you choose
            </Button>
          </div>
        )}

        {step === 'advisor' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Lightbulb className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">{GUIDANCE_QUESTIONS[advisorIndex].question}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => handleAdvisorAnswer('yes')}>Yes</Button>
              <Button variant="outline" onClick={() => handleAdvisorAnswer('no')}>No</Button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Question {advisorIndex + 1} of {GUIDANCE_QUESTIONS.length}
            </div>
          </div>
        )}

        {step === 'select' && recommendation && (
          <div className="space-y-4 py-4">
            <Alert className={cn(
              recommendation === 'llm' ? 'bg-primary/5 border-primary/20' : 'bg-accent/5 border-accent/20'
            )}>
              <AlertDescription>
                Based on your answers, we recommend using{' '}
                <strong>{recommendation === 'llm' ? 'LLM as Judge' : 'Deterministic'}</strong> assertions.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button onClick={() => handleChoose(recommendation)}>
                Add {recommendation === 'llm' ? 'LLM Rubric' : 'Deterministic'} Assertion
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Generate Assertions Dialog
function GenerateAssertionsDialog({ 
  open, 
  onOpenChange,
  onAccept,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onAccept: (assertions: Assertion[]) => void;
}) {
  const { config } = useEval();
  const [suggestions, setSuggestions] = useState<AssertionSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate AI generation delay
    setTimeout(() => {
      const tests = typeof config.tests === 'string' ? [] : config.tests;
      const result = generateAssertionSuggestions(config.prompts, tests, config.defaultTest.assert);
      setSuggestions(result);
      setSelected(new Set(result.map(s => s.id)));
      setIsGenerating(false);
    }, 1000);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleAccept = () => {
    const acceptedAssertions: Assertion[] = suggestions
      .filter(s => selected.has(s.id))
      .map(s => ({
        id: generateId(),
        type: s.assertionType,
        metric: s.metric,
        value: s.value,
        ...(s.type === 'llm' ? {
          provider: {
            id: 'openai:gpt-5-mini-2025-08-07',
            config: { max_tokens: 30000, temperature: 0 },
          },
        } : {}),
      }));
    onAccept(acceptedAssertions);
    onOpenChange(false);
    setSuggestions([]);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSuggestions([]); setSelected(new Set()); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Assertions
          </DialogTitle>
          <DialogDescription>
            AI will analyze your prompts and dataset to suggest relevant assertions
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-4">
                Click generate to get AI-suggested assertions based on your prompts and dataset
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id}
                  className={cn(
                    "rounded-lg border p-4 cursor-pointer transition-colors",
                    selected.has(suggestion.id) 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-muted-foreground"
                  )}
                  onClick={() => toggleSelection(suggestion.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      selected.has(suggestion.id) 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-muted-foreground"
                    )}>
                      {selected.has(suggestion.id) && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'rounded px-2 py-0.5 text-xs font-medium',
                          suggestion.type === 'llm' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-accent/10 text-accent-foreground'
                        )}>
                          {suggestion.type === 'llm' ? 'LLM' : 'Deterministic'}
                        </span>
                        <span className="text-sm font-medium">{suggestion.assertionType}</span>
                      </div>
                      <div className="text-sm font-medium text-foreground">{suggestion.metric}</div>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.explanation}</p>
                      <div className="mt-2 rounded bg-muted/50 p-2">
                        <code className="text-xs text-muted-foreground line-clamp-2">
                          {suggestion.value.substring(0, 100)}{suggestion.value.length > 100 ? '...' : ''}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {suggestions.length > 0 && (
          <DialogFooter className="border-t pt-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {selected.size} of {suggestions.length} selected
            </div>
            <Button variant="outline" onClick={() => { setSuggestions([]); setSelected(new Set()); }}>
              Regenerate
            </Button>
            <Button onClick={handleAccept} disabled={selected.size === 0}>
              <Check className="mr-2 h-4 w-4" />
              Accept Selected
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AssertionsSection() {
  const { config, addAssertion, updateAssertion, deleteAssertion, duplicateAssertion } = useEval();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const handleAddAssertion = (type: 'deterministic' | 'llm') => {
    if (type === 'llm') {
      addAssertion({
        id: generateId(),
        type: 'llm-rubric',
        value: '',
        provider: {
          id: 'openai:gpt-5-mini-2025-08-07',
          config: { max_tokens: 30000, temperature: 0 },
        },
      });
    } else {
      addAssertion({
        id: generateId(),
        type: 'equals',
        value: '',
      });
    }
  };

  const handleAcceptGeneratedAssertions = (assertions: Assertion[]) => {
    assertions.forEach(assertion => addAssertion(assertion));
  };

  const assertions = config.defaultTest.assert;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Assertions</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateDialogOpen(true)}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Generate Assertions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Assertion
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {assertions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No assertions configured. Add assertions to define what to check in the output.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddAssertion('deterministic')}
              >
                Add Deterministic
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddAssertion('llm')}
              >
                Add LLM Judge
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {assertions.map((assertion, index) => (
              <AssertionEditor
                key={assertion.id}
                assertion={assertion}
                index={index}
                onUpdate={(updated) => updateAssertion(index, updated)}
                onDelete={() => deleteAssertion(index)}
                onDuplicate={() => duplicateAssertion(index)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <AddAssertionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddAssertion}
      />

      <GenerateAssertionsDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onAccept={handleAcceptGeneratedAssertions}
      />
    </Card>
  );
}
