'use client';

import { useState } from 'react';
import { Wand2, Save, X, Play, Code, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEval } from '@/lib/eval-store';
import { DescriptionSection } from './sections/description-section';
import { PromptsSection } from './sections/prompts-section';
import { AssertionsSection } from './sections/assertions-section';
import { DatasetSection } from './sections/dataset-section';
import { YamlHighlighter } from './yaml-highlighter';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function MainEditor() {
  const { configName, setConfigName, saveConfig, yaml } = useEval();
  const [showYaml, setShowYaml] = useState(true);
  const [yamlTheme, setYamlTheme] = useState<'light' | 'dark'>('dark');

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Configuration Name</label>
            <Input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="mt-1 max-w-md border-border bg-card"
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
                  onClick={() => setShowYaml(!showYaml)}
                >
                  {showYaml ? <EyeOff className="h-5 w-5" /> : <Code className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showYaml ? 'Hide YAML' : 'Show YAML'}</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Wand2 className="h-5 w-5" />
            </Button>
            <Button variant="secondary" onClick={saveConfig}>
              <Save className="mr-2 h-4 w-4" />
              SAVE
            </Button>
            <Button variant="secondary">
              <X className="mr-2 h-4 w-4" />
              CANCEL
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Play className="mr-2 h-4 w-4" />
              RUN
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Eval relevancy: <span className="text-foreground">not calculated</span>{' '}
          <button className="text-primary hover:underline">Calculate</button>
        </div>
      </div>

      {/* Content Area */}
      {showYaml ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - UI Editor */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full">
              <div className="space-y-6 p-6">
                <DescriptionSection />
                <PromptsSection />
                <AssertionsSection />
                <DatasetSection />
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - YAML Preview */}
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <h3 className="text-sm font-medium">YAML Preview</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setYamlTheme(yamlTheme === 'light' ? 'dark' : 'light')}
                    >
                      {yamlTheme === 'light' ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Switch to {yamlTheme === 'light' ? 'dark' : 'light'} theme
                  </TooltipContent>
                </Tooltip>
              </div>
              <ScrollArea className="flex-1">
                <div className={cn(
                  'min-h-full p-4',
                  yamlTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
                )}>
                  <YamlHighlighter code={yaml} theme={yamlTheme} />
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <DescriptionSection />
            <PromptsSection />
            <AssertionsSection />
            <DatasetSection />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
