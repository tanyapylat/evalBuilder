import {
  defaultPromptVersionContent,
  type PromptVersionContent,
} from '@/lib/prompt-studio-types';

export interface ProjectRow {
  id: string;
  name: string;
}

export interface VersionRow {
  id: string;
  name: string;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Accepts { items }, { data }, or a raw array. Rows: { id, name } or { promptProjectId, name } … */
export function mapProjectList(json: unknown): ProjectRow[] {
  let rows: unknown[] = [];
  const o = asRecord(json);
  if (Array.isArray(json)) rows = json;
  else if (o) {
    if (Array.isArray(o.items)) rows = o.items;
    else if (Array.isArray(o.data)) rows = o.data;
    else if (Array.isArray(o.projects)) rows = o.projects;
  }
  return rows.map((r, i) => mapProjectRow(r, i)).filter((x): x is ProjectRow => x !== null);
}

function mapProjectRow(row: unknown, fallbackIndex: number): ProjectRow | null {
  const o = asRecord(row);
  if (!o) return null;
  const id = o.id ?? o.promptProjectId ?? o.projectId ?? o.promptId;
  const name = o.name ?? o.title ?? o.label ?? `Project ${String(id ?? fallbackIndex)}`;
  if (id === undefined || id === null) return null;
  return { id: String(id), name: String(name) };
}

export function mapVersionList(json: unknown): VersionRow[] {
  let rows: unknown[] = [];
  const o = asRecord(json);
  if (Array.isArray(json)) rows = json;
  else if (o) {
    if (Array.isArray(o.items)) rows = o.items;
    else if (Array.isArray(o.data)) rows = o.data;
    else if (Array.isArray(o.versions)) rows = o.versions;
  }
  return rows.map((r, i) => mapVersionRow(r, i)).filter((x): x is VersionRow => x !== null);
}

function mapVersionRow(row: unknown, fallbackIndex: number): VersionRow | null {
  const o = asRecord(row);
  if (!o) return null;
  const id = o.id ?? o.versionId ?? o.promptVersionId;
  const name = o.name ?? o.label ?? o.title ?? `Version ${String(id ?? fallbackIndex)}`;
  if (id === undefined || id === null) return null;
  return { id: String(id), name: String(name) };
}

/**
 * Maps upstream JSON to PromptVersionContent. Tries common Prompt Management shapes;
 * adjust here when your API schema is known.
 */
export function mapToPromptVersionContent(json: unknown): PromptVersionContent {
  const base = defaultPromptVersionContent();
  const o = asRecord(json);
  if (!o) return base;

  const nested =
    asRecord(o.config) ??
    asRecord(o.promptConfig) ??
    asRecord(o.version) ??
    asRecord(o.payload) ??
    o;

  const messagesRaw = nested.messages ?? o.messages;
  if (Array.isArray(messagesRaw)) {
    const messages = messagesRaw
      .map((m) => {
        const mr = asRecord(m);
        if (!mr) return null;
        const role = mr.role;
        const content = mr.content;
        if (
          (role === 'system' || role === 'user' || role === 'assistant') &&
          typeof content === 'string'
        ) {
          return { role, content };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (messages.length > 0) base.messages = messages;
  }

  const varsRaw = nested.variables ?? o.variables;
  if (Array.isArray(varsRaw) && varsRaw.every((x) => typeof x === 'string')) {
    base.variables = varsRaw as string[];
  }

  const vendor = nested.vendor ?? o.vendor;
  if (typeof vendor === 'string') base.vendor = vendor;

  const model = nested.model ?? o.model;
  if (typeof model === 'string') base.model = model;

  const params = asRecord(nested.params) ?? asRecord(o.params);
  if (params) {
    if (typeof params.temperature === 'number') base.params.temperature = params.temperature;
    if (typeof params.max_tokens === 'number') base.params.max_tokens = params.max_tokens;
  }

  return base;
}

export function mapSaveVersionResponse(json: unknown): { versionId: string; name: string } {
  const o = asRecord(json);
  if (!o) return { versionId: 'unknown', name: 'New version' };
  const id = o.versionId ?? o.id ?? o.promptVersionId;
  const name = o.name ?? o.label ?? o.title ?? 'New version';
  return { versionId: String(id ?? 'unknown'), name: String(name) };
}
