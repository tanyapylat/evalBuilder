/** Demo resolution: “current” placeholders map to this project/version (most recent). */
export const DEMO_RESOLVED_PROJECT_ID = '2735';
export const DEMO_RESOLVED_VERSION_ID = '14631';

export function resolvePromptProjectId(promptId: string | number): string {
  const s = String(promptId);
  return s === '{{currentPromptProjectId}}' ? DEMO_RESOLVED_PROJECT_ID : s;
}

export function resolvePromptVersionId(
  promptId: string | number,
  versionId: string | number,
): string {
  const v = String(versionId);
  if (v === '{{currentPromptVersionId}}') {
    return DEMO_RESOLVED_VERSION_ID;
  }
  return v;
}
