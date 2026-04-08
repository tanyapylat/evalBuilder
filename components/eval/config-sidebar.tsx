'use client';

import { ArrowLeft, Plus, Check, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEval } from '@/lib/eval-store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfigSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function ConfigSidebar({ collapsed, onToggle }: ConfigSidebarProps) {
  const { savedConfigs, activeConfigId, loadConfig, createNewConfig } = useEval();

  if (collapsed) {
    return (
      <div className="flex h-full flex-col border-r border-border bg-card">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="m-2"
              onClick={onToggle}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand Configurations</TooltipContent>
        </Tooltip>
        
        <div className="flex-1 flex flex-col items-center gap-1 py-2">
          {savedConfigs.map((config) => {
            const isActive = config.id === activeConfigId;
            return (
              <Tooltip key={config.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => loadConfig(config.id)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-muted'
                    )}
                  >
                    <Check className={cn('h-4 w-4', isActive ? 'text-accent' : 'text-muted-foreground')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{config.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 p-0 text-primary hover:bg-transparent hover:text-primary/80">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-medium">BACK TO PROMPT</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggle}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="shrink-0 px-4 py-4">
        <h2 className="truncate text-lg font-semibold text-foreground">Configurations</h2>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <Button
          variant="outline"
          className="w-full justify-center gap-2 border-primary text-primary hover:bg-primary/5"
          onClick={createNewConfig}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="truncate">NEW CONFIG</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <nav className="space-y-1 px-2">
          {savedConfigs.map((config) => {
            const isActive = config.id === activeConfigId;
            const hasRuns = true;
            
            return (
              <button
                key={config.id}
                onClick={() => loadConfig(config.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{config.name}</span>
                {hasRuns ? (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
