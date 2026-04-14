'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import type { PromptConfig } from '@/lib/eval-types';
import type { PromptVersionContent } from '@/lib/prompt-studio-types';
import { clonePromptVersionContent } from '@/lib/prompt-studio-types';
import { resolvePromptProjectId, resolvePromptVersionId } from '@/lib/prompt-placeholders';

/** Stable key for the prompt row’s live editor buffer (project + version as in config). */
export function promptDraftKey(prompt: PromptConfig): string {
  const p = resolvePromptProjectId(prompt.promptId);
  const v = resolvePromptVersionId(prompt.promptId, prompt.versionId);
  return `${p}:${v}`;
}

type PromptDraftsContextValue = {
  setLivePromptContent: (prompt: PromptConfig, content: PromptVersionContent) => void;
  getLivePromptContent: (prompt: PromptConfig) => PromptVersionContent | undefined;
};

const PromptDraftsContext = createContext<PromptDraftsContextValue | null>(null);

/**
 * Tracks the latest prompt body from each embedded editor (including unsaved edits).
 * Read synchronously when generating assertions; updates do not need to re-render consumers.
 */
export function PromptDraftsProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<Record<string, PromptVersionContent>>({});

  const setLivePromptContent = useCallback(
    (prompt: PromptConfig, content: PromptVersionContent) => {
      mapRef.current[promptDraftKey(prompt)] = clonePromptVersionContent(content);
    },
    [],
  );

  const getLivePromptContent = useCallback((prompt: PromptConfig) => {
    const v = mapRef.current[promptDraftKey(prompt)];
    return v ? clonePromptVersionContent(v) : undefined;
  }, []);

  const value = useMemo(
    () => ({ setLivePromptContent, getLivePromptContent }),
    [setLivePromptContent, getLivePromptContent],
  );

  return (
    <PromptDraftsContext.Provider value={value}>{children}</PromptDraftsContext.Provider>
  );
}

export function usePromptDrafts(): PromptDraftsContextValue {
  const ctx = useContext(PromptDraftsContext);
  if (!ctx) {
    throw new Error('usePromptDrafts must be used within PromptDraftsProvider');
  }
  return ctx;
}
