'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface VariablePreviewProps {
  vars: Record<string, string>;
  className?: string;
}

export function VariablePreview({ vars, className }: VariablePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(vars);

  return (
    <div className={cn('space-y-1.5', className)}>
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className="text-xs font-semibold text-muted-foreground">{key}</span>
          <div
            className={cn(
              'mt-0.5 text-sm leading-relaxed text-foreground/80',
              !expanded && 'line-clamp-3',
            )}
          >
            {value}
          </div>
        </div>
      ))}
      {entries.some(([, v]) => v.length > 200) && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
