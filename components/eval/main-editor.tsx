'use client';

import dynamic from 'next/dynamic';
import { useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import { CodeXml, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useEval } from '@/lib/eval-store';
import { parseEvalConfigYaml } from '@/lib/yaml-utils';
import { DescriptionSection } from './sections/description-section';
import { PromptsSection } from './sections/prompts-section';
import { AssertionsSection } from './sections/assertions-section';
import { DatasetSection } from './sections/dataset-section';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
        {/* ── Header chrome ── */}
        <div className="shrink-0 border-b border-border px-6 py-4">
          {/* Row 1: Prompt project title */}
          <h1 className="text-lg font-semibold text-foreground">Prompt project name</h1>

          {/* Row 2: Config name + Form/YAML + action buttons */}
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <label className="text-xs font-medium text-muted-foreground">Configuration Name</label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="mt-1 border-border bg-card"
                placeholder="Enter configuration name"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Edit / pencil icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    type="button"
                    onClick={() => handleMainTabChange(mainTab === 'yaml' ? 'form' : 'yaml')}
                  >
                    <CodeXml className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{mainTab === 'yaml' ? 'Switch to Form' : 'View YAML'}</TooltipContent>
              </Tooltip>

              {/* SAVE */}
              <Button
                variant="outline"
                onClick={handleSave}
                className="border-border text-foreground shadow-none font-bold uppercase text-xs tracking-wide px-4"
              >
                Save
              </Button>

              {/* CANCEL */}
              <Button
                variant="outline"
                className="border-border text-foreground shadow-none font-bold uppercase text-xs tracking-wide px-4"
              >
                Cancel
              </Button>

              {/* RUN — solid primary with dropdown chevron */}
              <div className="flex">
                <Button
                  className="rounded-r-none shadow-none font-bold uppercase text-xs tracking-wide px-5"
                  onClick={handleRun}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Running…
                    </>
                  ) : (
                    'Run'
                  )}
                </Button>
                <Button
                  className="rounded-l-none border-l border-primary-foreground/25 shadow-none px-2"
                  disabled={isRunning}
                  aria-label="Run options"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Row 3: Eval relevancy + view toggle */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Eval relevancy:
              <span className="inline-flex h-5 items-center rounded-full bg-accent/15 px-2 text-xs font-semibold text-accent">
                —
              </span>
              <button type="button" className="text-sm text-primary hover:underline">
                View details
              </button>
            </div>

          </div>
        </div>

        {/* ── Form tab ── */}
        <TabsContent value="form" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <ScrollArea className="flex-1">
            <div className="p-6">
              <DescriptionSection />
              <Separator className="my-6" />
              <PromptsSection />
              <Separator className="my-6" />
              <AssertionsSection />
              <Separator className="my-6" />
              <DatasetSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── YAML tab ── */}
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
