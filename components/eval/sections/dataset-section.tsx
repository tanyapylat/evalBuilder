'use client';

import { useState, useRef } from 'react';
import { useEval } from '@/lib/eval-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, FileSpreadsheet, Edit2, Link, Sparkles, AlertTriangle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateId } from '@/lib/yaml-utils';
import { generateTestCases, generateEdgeCases, type TestCaseSuggestion } from '@/lib/ai-assistance';
import { cn } from '@/lib/utils';
import type { TestCase } from '@/lib/eval-types';

function TestCaseEditor({
  testCase,
  onSave,
  onCancel,
}: {
  testCase: TestCase | null;
  onSave: (testCase: TestCase) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(testCase?.description || '');
  const [variables, setVariables] = useState<Array<{ key: string; value: string }>>(
    testCase?.vars
      ? Object.entries(testCase.vars).map(([key, value]) => ({ key, value }))
      : [{ key: 'user_message', value: '' }]
  );

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
        <Label htmlFor="testDescription">Description (optional)</Label>
        <Input
          id="testDescription"
          placeholder="Describe this test case..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <Label>Variables</Label>
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

// Generate Tests Dialog
function GenerateTestsDialog({ 
  open, 
  onOpenChange,
  onAccept,
  mode,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onAccept: (tests: TestCase[]) => void;
  mode: 'tests' | 'edge-cases';
}) {
  const { config } = useEval();
  const [suggestions, setSuggestions] = useState<TestCaseSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const tests = typeof config.tests === 'string' ? [] : config.tests;
      const result = mode === 'edge-cases'
        ? generateEdgeCases(config.prompts, config.defaultTest.assert, tests)
        : generateTestCases(config.prompts, config.defaultTest.assert, tests);
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
    const acceptedTests: TestCase[] = suggestions
      .filter(s => selected.has(s.id))
      .map(s => ({
        id: generateId(),
        description: s.description,
        vars: s.vars,
      }));
    onAccept(acceptedTests);
    onOpenChange(false);
    setSuggestions([]);
    setSelected(new Set());
  };

  const title = mode === 'edge-cases' ? 'Suggest Edge Cases' : 'Generate Tests';
  const description = mode === 'edge-cases' 
    ? 'AI will suggest edge cases and boundary inputs to test your assertions'
    : 'AI will generate test cases based on your prompts and assertions';

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSuggestions([]); setSelected(new Set()); } }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edge-cases' ? (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <div className={cn(
                "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
                mode === 'edge-cases' ? 'bg-orange-500/10' : 'bg-primary/10'
              )}>
                {mode === 'edge-cases' ? (
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                ) : (
                  <Sparkles className="h-8 w-8 text-primary" />
                )}
              </div>
              <p className="text-muted-foreground mb-4">
                {mode === 'edge-cases' 
                  ? 'Click generate to get AI-suggested edge cases and boundary conditions'
                  : 'Click generate to get AI-suggested test cases based on your configuration'
                }
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate {mode === 'edge-cases' ? 'Edge Cases' : 'Tests'}
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
                        <Badge variant={suggestion.tag === 'edge' ? 'destructive' : 'secondary'}>
                          {suggestion.tag === 'edge' ? 'Edge Case' : 'Normal'}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-foreground">{suggestion.description}</div>
                      <div className="mt-2 rounded bg-muted/50 p-2">
                        {Object.entries(suggestion.vars).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-muted-foreground">{key}:</span>{' '}
                            <span className="text-foreground line-clamp-2">{String(value).substring(0, 100)}{String(value).length > 100 ? '...' : ''}</span>
                          </div>
                        ))}
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
              Add Selected
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CsvImportDialog({ onImport, onSetUrl }: { 
  onImport: (tests: TestCase[]) => void;
  onSetUrl: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvUrl, setCsvUrl] = useState('');
  const [importMode, setImportMode] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): TestCase[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const tests: TestCase[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parsing (doesn't handle quoted commas)
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const vars: Record<string, string> = {};

      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          vars[header] = values[index];
        }
      });

      tests.push({
        id: generateId(),
        vars,
      });
    }

    return tests;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (importMode === 'url' && csvUrl) {
      onSetUrl(csvUrl);
      setOpen(false);
      setCsvUrl('');
    } else if (csvContent) {
      const tests = parseCSV(csvContent);
      onImport(tests);
      setOpen(false);
      setCsvContent('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Test Cases</DialogTitle>
          <DialogDescription>
            Import test cases from a CSV file or link to an external dataset
          </DialogDescription>
        </DialogHeader>

        <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'url' | 'file')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">
              <Link className="mr-2 h-4 w-4" />
              Dataset URL
            </TabsTrigger>
            <TabsTrigger value="file">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Upload CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Dataset URL</Label>
              <Input
                placeholder="https://example.sharepoint.com/...csv"
                value={csvUrl}
                onChange={(e) => setCsvUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The URL will be referenced directly in the YAML config. The dataset will be fetched at runtime.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Choose File
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Or Paste CSV Content</Label>
              <Textarea
                placeholder="variable1,variable2&#10;value1,value2&#10;value3,value4"
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="min-h-32 font-mono text-sm"
              />
            </div>

            {csvContent && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  Preview: {parseCSV(csvContent).length} test cases detected
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={importMode === 'url' ? !csvUrl : !csvContent}
          >
            {importMode === 'url' ? 'Use URL' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DatasetSection() {
  const { config, addTest, updateTest, deleteTest, setTestsUrl } = useEval();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [generateTestsOpen, setGenerateTestsOpen] = useState(false);
  const [generateEdgeCasesOpen, setGenerateEdgeCasesOpen] = useState(false);

  const isUrlDataset = typeof config.tests === 'string';
  const tests = isUrlDataset ? [] : (config.tests as TestCase[]);

  // Get all unique variable keys
  const allKeys = Array.from(
    new Set(tests.flatMap((t) => Object.keys(t.vars)))
  );

  const handleSave = (testCase: TestCase) => {
    if (editingIndex !== null) {
      updateTest(editingIndex, testCase);
      setEditingIndex(null);
    } else {
      addTest(testCase);
      setIsAddingNew(false);
    }
  };

  const handleImportCSV = (importedTests: TestCase[]) => {
    importedTests.forEach((test) => addTest(test));
  };

  const handleSetUrl = (url: string) => {
    setTestsUrl(url);
  };

  const handleClearUrl = () => {
    setTestsUrl('');
  };

  const handleAcceptGeneratedTests = (tests: TestCase[]) => {
    tests.forEach(test => addTest(test));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Dataset / Tests</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setGenerateTestsOpen(true)}
              disabled={isUrlDataset}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Tests
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setGenerateEdgeCasesOpen(true)}
              disabled={isUrlDataset}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Suggest Edge Cases
            </Button>
            <CsvImportDialog onImport={handleImportCSV} onSetUrl={handleSetUrl} />
            {!isUrlDataset && (
              <Button size="sm" onClick={() => setIsAddingNew(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Test
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isUrlDataset ? (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Dataset URL</p>
                <p className="text-sm text-muted-foreground truncate">{config.tests as string}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearUrl}>
                Clear URL
              </Button>
            </div>
          </div>
        ) : (
          <>
            {isAddingNew && (
              <div className="mb-6 rounded-lg border border-border p-4">
                <h4 className="mb-4 text-sm font-medium">New Test Case</h4>
                <TestCaseEditor
                  testCase={null}
                  onSave={handleSave}
                  onCancel={() => setIsAddingNew(false)}
                />
              </div>
            )}

            {tests.length === 0 && !isAddingNew ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No test cases defined. Add test cases or import from CSV.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => setIsAddingNew(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Test Case
                  </Button>
                </div>
              </div>
            ) : tests.length > 0 ? (
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                          <TableCell colSpan={allKeys.length + 2}>
                            <TestCaseEditor
                              testCase={test}
                              onSave={handleSave}
                              onCancel={() => setEditingIndex(null)}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={test.id}>
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
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
