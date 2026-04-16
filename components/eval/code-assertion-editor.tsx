'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const JS_PLACEHOLDER = `// The variable \`output\` contains the LLM response string.
// Return true/false, a score (number), or a GradingResult object.
// Example:
// output.includes('hello') && output.length < 500

output.length < 1000
`;

const PY_PLACEHOLDER = `# The variable \`output\` contains the LLM response string.
# A \`context\` dict is also available with: prompt, vars, test, config.
# Return True/False, a score (float), or a dict with pass/score/reason.
# Example:
# len(output) < 500 and 'hello' in output.lower()

len(output) < 1000
`;

const JS_MULTILINE_PLACEHOLDER = `// Multi-line example — return a GradingResult object:
const words = output.split(/\\s+/).length;
if (words > 50 && words < 200) {
  return { pass: true, score: 1.0, reason: 'Good length' };
}
return { pass: false, score: 0, reason: \`Word count \${words} out of range\` };
`;

const PY_MULTILINE_PLACEHOLDER = `# Multi-line example — return a GradingResult dict:
words = len(output.split())
if 50 < words < 200:
    return {
        'pass': True,
        'score': 1.0,
        'reason': 'Good length',
    }
return {
    'pass': False,
    'score': 0,
    'reason': f'Word count {words} out of range',
}
`;

export interface CodeAssertionEditorProps {
  language: 'javascript' | 'python';
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CodeAssertionEditor({
  language,
  value,
  onChange,
  className,
}: CodeAssertionEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';
  const placeholder = language === 'python' ? PY_PLACEHOLDER : JS_PLACEHOLDER;

  if (!mounted) {
    return (
      <div
        className={cn('h-[200px] animate-pulse rounded-md bg-muted', className)}
        aria-hidden
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="overflow-hidden rounded-md border border-border">
        <Editor
          height="200px"
          language={language}
          theme={theme}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            tabSize: language === 'python' ? 4 : 2,
            insertSpaces: true,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            folding: true,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            smoothScrolling: true,
            padding: { top: 8, bottom: 8 },
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            suggest: { showKeywords: true, showSnippets: true },
          }}
        />
      </div>
      {!value.trim() && (
        <p className="text-xs text-muted-foreground">
          {placeholder.split('\n').slice(0, 2).join(' ').replace(/^[#/]+ ?/gm, '')}
        </p>
      )}
    </div>
  );
}

export { JS_PLACEHOLDER, PY_PLACEHOLDER, JS_MULTILINE_PLACEHOLDER, PY_MULTILINE_PLACEHOLDER };
