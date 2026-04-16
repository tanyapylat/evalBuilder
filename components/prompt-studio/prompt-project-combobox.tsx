'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface PromptProjectOption {
  id: string;
  name: string;
}

interface PromptProjectComboboxProps {
  projects: PromptProjectOption[];
  value: string;
  onValueChange: (projectId: string) => void;
  disabled?: boolean;
  className?: string;
  /** Project ID to label as "current" (e.g. the Prompt Studio active project). */
  currentProjectId?: string;
}

export function PromptProjectCombobox({
  projects,
  value,
  onValueChange,
  disabled,
  className,
  currentProjectId,
}: PromptProjectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = projects.find((p) => p.id === value);
  const isCurrent = (id: string) => !!currentProjectId && id === currentProjectId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('mt-1.5 w-full justify-between font-normal bg-muted/50 hover:bg-muted hover:text-foreground', className)}
        >
          <span className="truncate text-left">
            {selected ? (
              <>
                <span className="font-medium">{selected.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">ID {selected.id}</span>
                {isCurrent(selected.id) && (
                  <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">current</Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Select project…</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          filter={(value, search) => {
            const item = projects.find((p) => p.id === value);
            if (!item) return 0;
            const q = search.toLowerCase();
            const hay = `${item.name} ${item.id}`.toLowerCase();
            return hay.includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name or ID…" />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup>
              {projects
                .filter((p) => p.id !== '{{currentPromptProjectId}}')
                .map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.id}
                  onSelect={() => {
                    onValueChange(project.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === project.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span>{project.name}</span>
                      {isCurrent(project.id) && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">current</Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">ID {project.id}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
