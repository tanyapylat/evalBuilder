import {
  mapProjectList,
  mapSaveVersionResponse,
  mapToPromptVersionContent,
  mapVersionList,
  type ProjectRow,
  type VersionRow,
} from '@/lib/prompt-management/map-response';
import type { PromptVersionContent } from '@/lib/prompt-studio-types';
import {
  resolvePromptProjectId,
  resolvePromptVersionId,
} from '@/lib/prompt-placeholders';

const PREFIX = '/api/prompt-management';

/** REST paths under `/api/v3/` on the upstream server (edit to match your Prompt Management API). */
export const PM_REST = {
  projects: () => `prompt-projects?limit=50`,
  versions: (projectId: string) =>
    `prompt-projects/${encodeURIComponent(projectId)}/versions`,
  version: (projectId: string, versionId: string) =>
    `prompt-projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}`,
  createVersion: (projectId: string) =>
    `prompt-projects/${encodeURIComponent(projectId)}/versions`,
} as const;

async function pmFetchJson(path: string, init?: RequestInit): Promise<unknown> {
  const url = `${PREFIX}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

export async function remoteListProjects(): Promise<ProjectRow[]> {
  const json = await pmFetchJson(PM_REST.projects());
  return mapProjectList(json);
}

export async function remoteListVersions(promptProjectId: string | number): Promise<VersionRow[]> {
  const projectId = resolvePromptProjectId(promptProjectId);
  const json = await pmFetchJson(PM_REST.versions(projectId));
  return mapVersionList(json);
}

export async function remoteGetPromptVersionContent(
  promptProjectId: string | number,
  versionId: string | number,
): Promise<PromptVersionContent> {
  const projectId = resolvePromptProjectId(promptProjectId);
  const vid = resolvePromptVersionId(promptProjectId, versionId);
  const json = await pmFetchJson(PM_REST.version(projectId, vid));
  return mapToPromptVersionContent(json);
}

export async function remoteSaveAsNewVersion(
  promptProjectId: string | number,
  baseVersionId: string | number,
  content: PromptVersionContent,
): Promise<{ versionId: string; name: string }> {
  const resolved = resolvePromptProjectId(promptProjectId);
  const base = resolvePromptVersionId(promptProjectId, baseVersionId);
  const json = await pmFetchJson(PM_REST.createVersion(resolved), {
    method: 'POST',
    body: JSON.stringify({
      baseVersionId: base,
      ...content,
    }),
  });
  return mapSaveVersionResponse(json);
}
