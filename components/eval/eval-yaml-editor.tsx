'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export interface EvalYamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function EvalYamlEditor({ value, onChange, className }: EvalYamlEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';

  if (!mounted) {
    return (
      <div
        className={cn('h-full min-h-[200px] animate-pulse bg-muted', className)}
        aria-hidden
      />
    );
  }

  return (
    <div className={cn('h-full min-h-0 overflow-hidden rounded-md border border-border', className)}>
      <Editor
        height="100%"
        language="yaml"
        theme={theme}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          automaticLayout: true,
          minimap: { enabled: true, scale: 0.85 },
          fontSize: 13,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          formatOnPaste: false,
          formatOnType: false,
          folding: true,
          renderLineHighlight: 'all',
          guides: {
            bracketPairs: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        }}
      />
    </div>
  );
}
