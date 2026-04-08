'use client';

import { useMemo } from 'react';

interface YamlHighlighterProps {
  code: string;
  theme?: 'light' | 'dark';
}

// Token types for YAML syntax
type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'comment' | 'punctuation' | 'text';

interface Token {
  type: TokenType;
  value: string;
}

// Light theme colors
const lightColors: Record<TokenType, string> = {
  key: 'text-blue-700',
  string: 'text-green-700',
  number: 'text-orange-600',
  boolean: 'text-purple-600',
  null: 'text-gray-500',
  comment: 'text-gray-400 italic',
  punctuation: 'text-gray-600',
  text: 'text-foreground',
};

// Dark theme colors
const darkColors: Record<TokenType, string> = {
  key: 'text-sky-400',
  string: 'text-green-400',
  number: 'text-orange-400',
  boolean: 'text-purple-400',
  null: 'text-gray-500',
  comment: 'text-gray-500 italic',
  punctuation: 'text-gray-400',
  text: 'text-gray-200',
};

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  
  // Empty line
  if (!line.trim()) {
    tokens.push({ type: 'text', value: line });
    return tokens;
  }

  // Comment line
  if (line.trim().startsWith('#')) {
    const indent = line.match(/^(\s*)/)?.[1] || '';
    tokens.push({ type: 'text', value: indent });
    tokens.push({ type: 'comment', value: line.trim() });
    return tokens;
  }

  // Process the line character by character
  let remaining = line;
  
  // Handle leading whitespace
  const indentMatch = remaining.match(/^(\s+)/);
  if (indentMatch) {
    tokens.push({ type: 'text', value: indentMatch[1] });
    remaining = remaining.slice(indentMatch[1].length);
  }

  // Handle list items
  if (remaining.startsWith('- ')) {
    tokens.push({ type: 'punctuation', value: '- ' });
    remaining = remaining.slice(2);
  }

  // Check for key: value pattern
  const keyMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*)(\s*:\s*)/);
  if (keyMatch) {
    tokens.push({ type: 'key', value: keyMatch[1] });
    tokens.push({ type: 'punctuation', value: keyMatch[2] });
    remaining = remaining.slice(keyMatch[0].length);
  }

  // Check for quoted key: value pattern
  const quotedKeyMatch = remaining.match(/^(['"][^'"]*['"])(\s*:\s*)/);
  if (quotedKeyMatch) {
    tokens.push({ type: 'key', value: quotedKeyMatch[1] });
    tokens.push({ type: 'punctuation', value: quotedKeyMatch[2] });
    remaining = remaining.slice(quotedKeyMatch[0].length);
  }

  // Handle the value part
  if (remaining) {
    // Multiline string indicator
    if (remaining === '|' || remaining === '>' || remaining === '|-' || remaining === '>-' || remaining.startsWith('|2-')) {
      tokens.push({ type: 'punctuation', value: remaining });
    }
    // Quoted string
    else if (/^['"]/.test(remaining)) {
      tokens.push({ type: 'string', value: remaining });
    }
    // Number
    else if (/^-?\d+(\.\d+)?$/.test(remaining.trim())) {
      tokens.push({ type: 'number', value: remaining });
    }
    // Boolean
    else if (/^(true|false)$/i.test(remaining.trim())) {
      tokens.push({ type: 'boolean', value: remaining });
    }
    // Null
    else if (/^(null|~)$/i.test(remaining.trim())) {
      tokens.push({ type: 'null', value: remaining });
    }
    // Inline comment
    else if (remaining.includes(' #')) {
      const commentIndex = remaining.indexOf(' #');
      const beforeComment = remaining.slice(0, commentIndex);
      const comment = remaining.slice(commentIndex);
      
      if (beforeComment) {
        // Check what type the value before comment is
        if (/^-?\d+(\.\d+)?$/.test(beforeComment.trim())) {
          tokens.push({ type: 'number', value: beforeComment });
        } else if (/^(true|false)$/i.test(beforeComment.trim())) {
          tokens.push({ type: 'boolean', value: beforeComment });
        } else {
          tokens.push({ type: 'string', value: beforeComment });
        }
      }
      tokens.push({ type: 'comment', value: comment });
    }
    // Template variable {{...}}
    else if (remaining.includes('{{')) {
      // Split by template variables
      const parts = remaining.split(/({{[^}]+}})/g);
      parts.forEach(part => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          tokens.push({ type: 'key', value: part });
        } else if (part) {
          tokens.push({ type: 'string', value: part });
        }
      });
    }
    // Regular string value
    else {
      tokens.push({ type: 'string', value: remaining });
    }
  }

  return tokens;
}

export function YamlHighlighter({ code, theme = 'light' }: YamlHighlighterProps) {
  const colors = theme === 'dark' ? darkColors : lightColors;
  
  const highlightedLines = useMemo(() => {
    const lines = code.split('\n');
    return lines.map((line, lineIndex) => {
      const tokens = tokenizeLine(line);
      return (
        <div key={lineIndex} className="leading-6">
          {tokens.length === 0 ? (
            <span>&nbsp;</span>
          ) : (
            tokens.map((token, tokenIndex) => (
              <span key={tokenIndex} className={colors[token.type]}>
                {token.value}
              </span>
            ))
          )}
        </div>
      );
    });
  }, [code, colors]);

  return (
    <pre className={`font-mono text-sm ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <code className="block">{highlightedLines}</code>
    </pre>
  );
}
