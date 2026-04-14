'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Check, Circle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEval } from '@/lib/eval-store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

interface ConfigSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function ConfigSidebar({ collapsed, onToggle }: ConfigSidebarProps) {
  const {
    savedConfigs,
    activeConfigId,
    designatedConfigId,
    setDesignatedConfigId,
    loadConfig,
    createNewConfig,
    deleteSavedConfig,
  } = useEval();

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const deleteTarget = deleteTargetId
    ? savedConfigs.find((c) => c.id === deleteTargetId)
    : undefined;

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
            const isDesignated = config.id === designatedConfigId;
            return (
              <Tooltip key={config.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => loadConfig(config.id)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-sm transition-colors',
                      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {isDesignated ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
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
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 p-0 text-primary hover:bg-transparent hover:text-[#0D90E8]">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-bold">Back to Prompt</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggle}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="shrink-0 px-4 pt-3 pb-2">
        <h2 className="truncate text-base font-medium text-foreground">Configurations</h2>
      </div>

      <div className="shrink-0 px-4 pb-3">
        <Button
          variant="outline"
          className="w-full justify-center gap-2 border-primary text-primary hover:bg-[#DBF1FF] active:bg-[#ADDEFF] font-bold"
          onClick={createNewConfig}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="truncate">+ New Config</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <nav className="space-y-1 px-2">
          {savedConfigs.map((config) => {
            const isActive = config.id === activeConfigId;
            const isDesignated = config.id === designatedConfigId;

            return (
              <div
                key={config.id}
                className={cn(
                  'flex w-full items-center gap-1 rounded-sm pr-1 transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <button
                  type="button"
                  onClick={() => loadConfig(config.id)}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-3 py-2.5 text-left',
                    !isActive && 'hover:bg-transparent',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{config.name}</span>
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDesignatedConfigId(config.id);
                      }}
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors',
                        isDesignated
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                      )}
                      aria-label={isDesignated ? 'Marked config' : 'Mark this config'}
                    >
                      {isDesignated ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {isDesignated ? 'Marked (click another row’s icon to move)' : 'Mark with check'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(config.id);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete configuration"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Delete</TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </nav>
      </div>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will be removed from the list. This cannot be undone.`
                : 'This configuration will be removed. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetId) deleteSavedConfig(deleteTargetId);
                setDeleteTargetId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
