'use client';

import dynamic from 'next/dynamic';
import { useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, X, Play, Loader2, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEval } from '@/lib/eval-store';
import { parseEvalConfigYaml } from '@/lib/yaml-utils';
import { DescriptionSection } from './sections/description-section';
import { PromptsSection } from './sections/prompts-section';
import { AssertionsSection } from './sections/assertions-section';
import { DatasetSection } from './sections/dataset-section';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EvalYamlEditorProps } from './eval-yaml-editor';

const EvalYamlEditor = dynamic(
  () => import('./eval-yaml-editor').then((m) => m.EvalYamlEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[200px] animate-pulse bg-muted" aria-hidden />
    ),
  },
) as ComponentType<EvalYamlEditorProps>;

export function MainEditor() {
  const { configName, setConfigName, saveConfig, yaml, runEval, isRunning, dispatch } = useEval();
  const [mainTab, setMainTab] = useState<'form' | 'yaml'>('form');
  const [yamlText, setYamlText] = useState('');

  const tryCommitYaml = (showToast = true): boolean => {
    try {
      const next = parseEvalConfigYaml(yamlText);
      dispatch({ type: 'SET_CONFIG', payload: next });
      return true;
    } catch (e) {
      if (showToast) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error(`Invalid YAML — ${message}`);
      }
      return false;
    }
  };

  const handleMainTabChange = (v: string) => {
    const next = v as 'form' | 'yaml';
    if (next === 'yaml') {
      setYamlText(yaml);
      setMainTab('yaml');
      return;
    }
    if (mainTab === 'yaml' && !tryCommitYaml(false)) {
      toast.warning('YAML had errors — switching back to form with the last valid config.');
    }
    setMainTab('form');
  };

  const handleSave = () => {
    if (mainTab === 'yaml' && !tryCommitYaml()) return;
    saveConfig();
  };

  const handleRun = async () => {
    if (mainTab === 'yaml' && !tryCommitYaml()) return;
    await runEval();
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-background">
      <Tabs
        value={mainTab}
        onValueChange={handleMainTabChange}
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <div className="shrink-0 border-b border-border px-6 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-base font-medium text-foreground">Prompt project name</h1>
            <TabsList className="h-9 shrink-0">
              <TabsTrigger value="form" className="text-xs">
                Form
              </TabsTrigger>
              <TabsTrigger value="yaml" className="text-xs">
                YAML
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Configuration Name</label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="mt-2 max-w-md border-border bg-card"
                placeholder="Enter configuration name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    type="button"
                    onClick={() => handleMainTabChange('yaml')}
                    title="YAML"
                  >
                    <Code className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>YAML</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" className="text-muted-foreground" title="AI Correct YAML">
                <Wand2 className="h-5 w-5" />
              </Button>
              <Button variant="default" onClick={handleSave} className="shadow-none">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button
                variant="outline"
                className="border-primary text-primary shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent/80"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button className="shadow-none" onClick={handleRun} disabled={isRunning}>
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {isRunning ? 'Running…' : 'Run'}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            Eval relevancy:{' '}
            <span className="italic">not calculated</span>
            <button type="button" className="ml-1 text-sm text-primary hover:underline">
              Calculate
            </button>
          </div>
        </div>

        <TabsContent value="form" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              <DescriptionSection />
              <PromptsSection />
              <AssertionsSection />
              <DatasetSection />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="yaml"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-2 data-[state=inactive]:hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <EvalYamlEditor
              value={yamlText}
              onChange={setYamlText}
              className="h-full min-h-[280px] flex-1 rounded-md border border-border"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
