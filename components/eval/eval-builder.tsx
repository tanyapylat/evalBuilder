'use client';

import { useState } from 'react';
import { ConfigSidebar } from './config-sidebar';
import { MainEditor } from './main-editor';
import { EvalRunsSidebar } from './eval-runs-sidebar';
import { EvalProvider } from '@/lib/eval-store';
import { PromptCatalogProvider } from '@/lib/prompt-catalog';
import { PromptDraftsProvider } from '@/lib/prompt-drafts-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export function EvalBuilder() {
  const [configSidebarCollapsed, setConfigSidebarCollapsed] = useState(false);
  const [runsSidebarCollapsed, setRunsSidebarCollapsed] = useState(false);

  return (
    <EvalProvider>
      <PromptCatalogProvider>
      <PromptDraftsProvider>
      <TooltipProvider>
        <ResizablePanelGroup direction="horizontal" className="h-screen min-h-0 overflow-hidden">
          {/* Left Sidebar - Configurations */}
          <ResizablePanel 
            defaultSize={15} 
            minSize={12}
            maxSize={25}
            collapsible
            collapsedSize={4}
            onCollapse={() => setConfigSidebarCollapsed(true)}
            onExpand={() => setConfigSidebarCollapsed(false)}
          >
            <ConfigSidebar 
              collapsed={configSidebarCollapsed} 
              onToggle={() => setConfigSidebarCollapsed(!configSidebarCollapsed)} 
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main Editor */}
          <ResizablePanel defaultSize={70} minSize={40}>
            <MainEditor />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Sidebar - Evaluation Runs */}
          <ResizablePanel 
            defaultSize={15} 
            minSize={12}
            maxSize={25}
            collapsible
            collapsedSize={4}
            onCollapse={() => setRunsSidebarCollapsed(true)}
            onExpand={() => setRunsSidebarCollapsed(false)}
          >
            <EvalRunsSidebar 
              collapsed={runsSidebarCollapsed} 
              onToggle={() => setRunsSidebarCollapsed(!runsSidebarCollapsed)} 
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
      </PromptDraftsProvider>
      </PromptCatalogProvider>
    </EvalProvider>
  );
}
