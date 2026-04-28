'use client';

import { Search, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FilterMode = 'all' | 'pass' | 'fail' | 'error';

interface ResultsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  counts: { all: number; pass: number; fail: number; error: number };
  allExpanded: boolean;
  onToggleExpand: () => void;
}

const FILTERS: { mode: FilterMode; label: string }[] = [
  { mode: 'all', label: 'All' },
  { mode: 'pass', label: 'Passes' },
  { mode: 'fail', label: 'Failures' },
  { mode: 'error', label: 'Errors' },
];

export function ResultsToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  allExpanded,
  onToggleExpand,
}: ResultsToolbarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-6 py-3">
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search variables or output…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {FILTERS.map(({ mode, label }) => {
          const count = counts[mode];
          const isActive = filter === mode;
          return (
            <Button
              key={mode}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFilterChange(mode)}
              className={cn('gap-1.5', !isActive && 'text-muted-foreground')}
            >
              {label}
              {count > 0 && (
                <Badge
                  variant={isActive ? 'secondary' : 'outline'}
                  className="ml-0.5 min-w-[1.25rem] px-1 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Expand / Collapse */}
      <Button variant="ghost" size="sm" onClick={onToggleExpand} className="gap-1.5 text-muted-foreground">
        {allExpanded ? (
          <>
            <ChevronsDownUp className="h-4 w-4" /> Collapse All
          </>
        ) : (
          <>
            <ChevronsUpDown className="h-4 w-4" /> Expand All
          </>
        )}
      </Button>
    </div>
  );
}
