'use client';

import { cn } from '@/lib/utils';

interface OutputPreviewProps {
  rawOutput: string;
  maxLines?: number;
  className?: string;
}

function tryFormatJson(raw: string): { isJson: boolean; formatted: string } {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      const lines = entries.map(([k, v]) => `${k}: ${String(v)}`);
      return { isJson: true, formatted: lines.join('\n') };
    }
  } catch {
    // not JSON
  }
  return { isJson: false, formatted: raw };
}

export function OutputPreview({ rawOutput, maxLines = 4, className }: OutputPreviewProps) {
  const { formatted } = tryFormatJson(rawOutput);

  return (
    <div
      className={cn(
        'overflow-hidden text-sm leading-relaxed text-foreground/80',
        className,
      )}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
      }}
    >
      {formatted}
    </div>
  );
}
