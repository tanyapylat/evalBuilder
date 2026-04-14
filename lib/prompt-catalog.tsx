'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  clonePromptVersionContent,
  defaultPromptVersionContent,
  type PromptVersionContent,
} from '@/lib/prompt-studio-types';
import { SAMPLE_PROMPT_PROJECTS, SAMPLE_PROMPT_VERSIONS } from '@/lib/eval-types';
import { isPromptManagementApiEnabled } from '@/lib/prompt-management/env';
import {
  remoteGetPromptVersionContent,
  remoteListProjects,
  remoteListVersions,
  remoteSaveAsNewVersion,
} from '@/lib/prompt-management/remote';
import {
  DEMO_RESOLVED_PROJECT_ID,
  DEMO_RESOLVED_VERSION_ID,
  resolvePromptProjectId,
  resolvePromptVersionId,
} from '@/lib/prompt-placeholders';

export {
  DEMO_RESOLVED_PROJECT_ID,
  DEMO_RESOLVED_VERSION_ID,
  resolvePromptProjectId,
  resolvePromptVersionId,
} from '@/lib/prompt-placeholders';

function contentKey(projectId: string | number, versionId: string | number): string {
  const p = resolvePromptProjectId(projectId);
  const v = resolvePromptVersionId(projectId, versionId);
  return `${p}:${v}`;
}

const SEED_CONTENT: Record<string, PromptVersionContent> = (() => {
  const base = defaultPromptVersionContent();
  const crm17905: PromptVersionContent = {
    ...clonePromptVersionContent(base),
    messages: [
      {
        role: 'system',
        content:
          'You draft JustAnswer follow-up emails. Use {{user_message}} for context. Output valid JSON only.',
      },
      { role: 'user', content: 'Summarize the thread and propose a subject line.\n\n{{user_message}}' },
    ],
    variables: ['user_message'],
    vendor: 'anthropic',
    model: 'claude-sonnet-4',
    params: { temperature: 0.2, max_tokens: 4096 },
  };
  const crm14631: PromptVersionContent = {
    ...clonePromptVersionContent(base),
    messages: [
      { role: 'system', content: 'You are a concise CRM assistant. Variables: {{user_message}}.' },
      { role: 'user', content: '{{user_message}}' },
    ],
    variables: ['user_message'],
    vendor: 'openai',
    model: 'gpt-4.1-2025-04-14',
    params: { temperature: 0, max_tokens: 3000 },
  };
  const p1234: PromptVersionContent = {
    ...clonePromptVersionContent(base),
    messages: [{ role: 'user', content: 'Hello {{name}}' }],
    variables: ['name'],
    vendor: 'openai',
    model: 'gpt-4.1-2025-04-14',
    params: { temperature: 0.5, max_tokens: 500 },
  };
  return {
    [`${DEMO_RESOLVED_PROJECT_ID}:17905`]: crm17905,
    [`${DEMO_RESOLVED_PROJECT_ID}:17903`]: clonePromptVersionContent(crm17905),
    [`${DEMO_RESOLVED_PROJECT_ID}:14631`]: crm14631,
    '1234:56789': p1234,
    '1234:56781': clonePromptVersionContent(p1234),
    '1234:56782': clonePromptVersionContent(p1234),
  };
})();

export interface VersionOption {
  id: string;
  name: string;
}

export interface PromptProjectOption {
  id: string;
  name: string;
}

function mergeVersionLists(a: VersionOption[], b: VersionOption[]): VersionOption[] {
  const m = new Map<string, VersionOption>();
  for (const v of a) m.set(v.id, v);
  for (const v of b) m.set(v.id, v);
  return Array.from(m.values());
}

function ensureCurrentProjectRow(rows: PromptProjectOption[]): PromptProjectOption[] {
  const placeholder: PromptProjectOption = {
    id: '{{currentPromptProjectId}}',
    name: 'Current Prompt Project',
  };
  if (rows.some((r) => r.id === placeholder.id)) return rows;
  return [placeholder, ...rows];
}

interface PromptCatalogContextValue {
  /** True when `NEXT_PUBLIC_PROMPT_MANAGEMENT_API` is set and remote calls are attempted. */
  remoteEnabled: boolean;
  projectsLoading: boolean;
  /** Projects for the combobox (remote or offline sample). */
  projectOptions: PromptProjectOption[];
  getVersions: (promptProjectId: string | number) => VersionOption[];
  loadVersionsForProject: (promptProjectId: string | number) => Promise<VersionOption[]>;
  /** Offline / sync snapshot (seed + local overrides). */
  getPromptVersionContent: (
    promptProjectId: string | number,
    versionId: string | number,
  ) => PromptVersionContent;
  /** Loads from Prompt Management API when enabled, otherwise same as `getPromptVersionContent`. */
  loadPromptVersionContent: (
    promptProjectId: string | number,
    versionId: string | number,
  ) => Promise<PromptVersionContent>;
  /** @deprecated Prefer `savePromptVersionAsNew` */
  saveAsNewVersion: (
    promptProjectId: string | number,
    baseVersionId: string | number,
    content: PromptVersionContent,
  ) => { versionId: string; name: string };
  savePromptVersionAsNew: (
    promptProjectId: string | number,
    baseVersionId: string | number,
    content: PromptVersionContent,
  ) => Promise<{ versionId: string; name: string; wasOfflineFallback: boolean }>;
}

const PromptCatalogContext = createContext<PromptCatalogContextValue | null>(null);

export function PromptCatalogProvider({ children }: { children: React.ReactNode }) {
  const remoteEnabled = isPromptManagementApiEnabled();
  const [extraVersions, setExtraVersions] = useState<Record<string, VersionOption[]>>({});
  const [contentOverrides, setContentOverrides] = useState<Record<string, PromptVersionContent>>({});
  const [projectOptions, setProjectOptions] = useState<PromptProjectOption[]>(() => [
    ...SAMPLE_PROMPT_PROJECTS,
  ]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (!remoteEnabled) return;
    let cancelled = false;
    setProjectsLoading(true);
    remoteListProjects()
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        const mapped = rows.map((r) => ({ id: r.id, name: r.name }));
        setProjectOptions(ensureCurrentProjectRow(mapped));
      })
      .catch(() => {
        if (!cancelled) {
          console.warn('[PromptCatalog] Could not load prompt projects from API; using offline sample list.');
        }
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [remoteEnabled]);

  const getVersions = useCallback((promptProjectId: string | number): VersionOption[] => {
    const raw = String(promptProjectId);
    const merged = new Map<string, VersionOption>();

    const staticList = SAMPLE_PROMPT_VERSIONS[raw] || [];
    for (const v of staticList) merged.set(v.id, v);

    const resolved = resolvePromptProjectId(promptProjectId);

    if (raw === '{{currentPromptProjectId}}') {
      const fromResolvedProject = SAMPLE_PROMPT_VERSIONS[DEMO_RESOLVED_PROJECT_ID] || [];
      for (const v of fromResolvedProject) merged.set(v.id, v);
      for (const v of extraVersions[DEMO_RESOLVED_PROJECT_ID] || []) merged.set(v.id, v);
    }

    for (const v of extraVersions[raw] || []) merged.set(v.id, v);
    for (const v of extraVersions[resolved] || []) merged.set(v.id, v);

    if (merged.size === 0) {
      const fallbackId = `${resolved}-default`;
      merged.set(fallbackId, { id: fallbackId, name: 'Current Version' });
    }

    return Array.from(merged.values());
  }, [extraVersions]);

  const getVersionsRef = useRef(getVersions);
  useEffect(() => {
    getVersionsRef.current = getVersions;
  });

  const loadVersionsForProject = useCallback(
    async (promptProjectId: string | number): Promise<VersionOption[]> => {
      const local = getVersionsRef.current(promptProjectId);
      if (!remoteEnabled) return local;
      try {
        const remote = await remoteListVersions(promptProjectId);
        const mapped = remote.map((r) => ({ id: r.id, name: r.name }));
        return mergeVersionLists(local, mapped);
      } catch {
        console.warn('[PromptCatalog] Could not load versions from API; showing offline list.');
        return local;
      }
    },
    [remoteEnabled],
  );

  const getPromptVersionContent = useCallback(
    (promptProjectId: string | number, versionId: string | number): PromptVersionContent => {
      const key = contentKey(promptProjectId, versionId);
      if (contentOverrides[key]) {
        return clonePromptVersionContent(contentOverrides[key]!);
      }
      if (SEED_CONTENT[key]) {
        return clonePromptVersionContent(SEED_CONTENT[key]!);
      }
      return clonePromptVersionContent(defaultPromptVersionContent());
    },
    [contentOverrides],
  );

  const loadPromptVersionContent = useCallback(
    async (
      promptProjectId: string | number,
      versionId: string | number,
    ): Promise<PromptVersionContent> => {
      const key = contentKey(promptProjectId, versionId);
      if (contentOverrides[key]) {
        return clonePromptVersionContent(contentOverrides[key]!);
      }
      if (remoteEnabled) {
        try {
          return await remoteGetPromptVersionContent(promptProjectId, versionId);
        } catch {
          console.warn('[PromptCatalog] Could not load prompt content from API; using offline sample.');
        }
      }
      return getPromptVersionContent(promptProjectId, versionId);
    },
    [remoteEnabled, getPromptVersionContent, contentOverrides],
  );

  const saveAsNewVersion = useCallback(
    (
      promptProjectId: string | number,
      baseVersionId: string | number,
      content: PromptVersionContent,
    ): { versionId: string; name: string } => {
      const resolvedProject = resolvePromptProjectId(promptProjectId);
      const newId = `nv-${Date.now().toString(36)}`;
      const name = `Version ${newId.slice(-8)} (New)`;
      const key = `${resolvedProject}:${newId}`;
      setContentOverrides((prev) => ({ ...prev, [key]: clonePromptVersionContent(content) }));
      setExtraVersions((prev) => {
        const list = prev[resolvedProject] || [];
        return {
          ...prev,
          [resolvedProject]: [...list, { id: newId, name }],
        };
      });
      return { versionId: newId, name };
    },
    [],
  );

  const savePromptVersionAsNew = useCallback(
    async (
      promptProjectId: string | number,
      baseVersionId: string | number,
      content: PromptVersionContent,
    ): Promise<{ versionId: string; name: string; wasOfflineFallback: boolean }> => {
      if (remoteEnabled) {
        try {
          const r = await remoteSaveAsNewVersion(promptProjectId, baseVersionId, content);
          const resolvedProject = resolvePromptProjectId(promptProjectId);
          setContentOverrides((prev) => ({
            ...prev,
            [`${resolvedProject}:${r.versionId}`]: clonePromptVersionContent(content),
          }));
          setExtraVersions((prev) => ({
            ...prev,
            [resolvedProject]: [
              ...(prev[resolvedProject] || []),
              { id: r.versionId, name: r.name },
            ],
          }));
          return { ...r, wasOfflineFallback: false };
        } catch {
          toast.warning('Remote API unavailable — saved new version locally for this session.');
        }
      }
      return { ...saveAsNewVersion(promptProjectId, baseVersionId, content), wasOfflineFallback: true };
    },
    [remoteEnabled, saveAsNewVersion],
  );

  const value = useMemo(
    () => ({
      remoteEnabled,
      projectsLoading,
      projectOptions,
      getVersions,
      loadVersionsForProject,
      getPromptVersionContent,
      loadPromptVersionContent,
      saveAsNewVersion,
      savePromptVersionAsNew,
    }),
    [
      remoteEnabled,
      projectsLoading,
      projectOptions,
      getVersions,
      loadVersionsForProject,
      getPromptVersionContent,
      loadPromptVersionContent,
      saveAsNewVersion,
      savePromptVersionAsNew,
    ],
  );

  return (
    <PromptCatalogContext.Provider value={value}>{children}</PromptCatalogContext.Provider>
  );
}

export function usePromptCatalog(): PromptCatalogContextValue {
  const ctx = useContext(PromptCatalogContext);
  if (!ctx) {
    throw new Error('usePromptCatalog must be used within PromptCatalogProvider');
  }
  return ctx;
}
