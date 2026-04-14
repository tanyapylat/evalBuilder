'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

export function PromptProjectCombobox({
  projects,
  value,
  onValueChange,
  disabled,
  className,
}: PromptProjectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = projects.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('mt-1.5 w-full justify-between font-normal', className)}
        >
          <span className="truncate text-left">
            {selected ? (
              <>
                <span className="font-medium">{selected.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">ID {selected.id}</span>
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
              {projects.map((project) => (
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
                    <span>{project.name}</span>
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
