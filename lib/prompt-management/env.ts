/** When true, UI loads projects/versions/content via `/api/prompt-management/*` (see server env). */
export function isPromptManagementApiEnabled(): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  const v = process.env.NEXT_PUBLIC_PROMPT_MANAGEMENT_API;
  return v === '1' || v === 'true';
}
