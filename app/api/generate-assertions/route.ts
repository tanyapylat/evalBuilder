import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ASSERTION_INFO,
  DETERMINISTIC_ASSERTIONS,
  LLM_ASSERTIONS,
  type AssertionType,
} from '@/lib/eval-types';

export const runtime = 'nodejs';

const promptContentSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
  variables: z.array(z.string()),
  vendor: z.string(),
  model: z.string(),
  params: z.object({
    temperature: z.number(),
    max_tokens: z.number(),
  }),
});

const bodySchema = z.object({
  prompts: z.array(
    z.object({
      label: z.string().optional(),
      content: promptContentSchema,
    }),
  ),
  existingAssertions: z.array(
    z.object({
      type: z.string(),
      metric: z.string().optional(),
      value: z.union([z.string(), z.array(z.string()), z.number()]),
    }),
  ),
  testsSummary: z.string().optional(),
  instructions: z.string().optional(),
  vendor: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const rawSuggestionSchema = z.object({
  type: z.string().transform((v) => (v === 'llm' ? 'llm' : 'deterministic') as 'deterministic' | 'llm'),
  assertionType: z.string(),
  metric: z.string(),
  value: z
    .union([z.string(), z.number(), z.array(z.string())])
    .transform((v) => {
      if (typeof v === 'number') return String(v);
      if (Array.isArray(v)) return v.join('\n');
      return v;
    }),
  explanation: z.string(),
});

const openAiEnvelopeSchema = z.object({
  suggestions: z.array(rawSuggestionSchema),
});

const ALL_ASSERTION_TYPES = Object.keys(ASSERTION_INFO) as AssertionType[];
const assertionTypeSet = new Set<string>(ALL_ASSERTION_TYPES);

/** Code execution assertions are not generated; coerce away if the model returns them. */
const DISALLOWED_GENERATION_TYPES = new Set<AssertionType>(['javascript', 'python']);

function normalizeAssertionType(
  kind: 'deterministic' | 'llm',
  assertionType: string,
): AssertionType {
  if (assertionTypeSet.has(assertionType)) {
    return assertionType as AssertionType;
  }
  return kind === 'llm' ? 'llm-rubric' : 'contains';
}

function normalizeSuggestion(s: z.infer<typeof rawSuggestionSchema>): {
  type: 'deterministic' | 'llm';
  assertionType: AssertionType;
  metric: string;
  value: string;
  explanation: string;
} {
  let assertionType = normalizeAssertionType(s.type, s.assertionType);
  let type = s.type;
  if (DISALLOWED_GENERATION_TYPES.has(assertionType)) {
    assertionType = 'llm-rubric';
    type = 'llm';
  }
  return {
    type,
    assertionType,
    metric: s.metric,
    value: s.value,
    explanation: s.explanation,
  };
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return m ? m[1]!.trim() : t;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not set on the server.' },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { prompts, existingAssertions, testsSummary, instructions, vendor: requestedVendor, model: requestedModel, temperature: requestedTemperature } = parsed.data;
  const vendor = requestedVendor?.trim() || 'openai';
  const model =
    requestedModel?.trim() || process.env.OPENAI_ASSERTION_MODEL?.trim() || 'gpt-4.1-2025-04-14';
  const temperature = requestedTemperature ?? 0.25;

  const deterministicList = DETERMINISTIC_ASSERTIONS.filter(
    (t) => !DISALLOWED_GENERATION_TYPES.has(t),
  ).join(', ');
  const llmList = LLM_ASSERTIONS.join(', ');
  const generatableTypes = ALL_ASSERTION_TYPES.filter((t) => !DISALLOWED_GENERATION_TYPES.has(t));
  const allTypesList = generatableTypes.join(', ');

  const userBlock = [
    '## Prompt content (exactly as configured — analyze as written; do not rewrite, summarize, or improve it)',
    JSON.stringify(prompts, null, 2),
    '',
    '## Existing assertions (avoid overlap with these)',
    JSON.stringify(existingAssertions, null, 2),
    testsSummary ? `\n## Dataset / tests\n${testsSummary}` : '',
    instructions ? `\n## Extra instructions from the user\n${instructions}` : '',
  ].join('\n');

  const systemPrompt = `You are generating evaluation assertions for the provided prompt(s).

Analyze the prompt exactly as given in the user message. Do not rewrite, summarize, or improve the prompt text.

Your goal is a short, high-value set of assertions for Promptfoo to evaluate outputs from this prompt.

Focus on:
1. The prompt’s core instructions and constraints
2. The most important output quality expectations
3. The most likely failure modes or edge cases
4. Criteria that are practical and useful for evaluation

Generation rules:
- Produce only 3 to 5 assertions in "suggestions" (never more than 5). If the prompt content is missing or unusable, return {"suggestions":[]}.
- Include only the most important assertions; avoid overlap, duplication, and low-value checks.
- Keep each assertion specific, testable, and focused on one idea.
- Prefer assertions directly useful in real evaluation workflows.

Assertion type rules:
- Generate a mix of types when appropriate.
- Use llm-rubric for subjective or qualitative checks (tone, clarity, helpfulness, completeness, instruction-following, safety).
- Use deterministic Promptfoo assertion types for objective checks (exact match, contains / not-contains, banned terms, JSON structure, regex, word count, length limits) when they fit naturally.
- Do not force deterministic assertions if the prompt does not support them.
- Never use assertion types "javascript" or "python" (no code-execution assertions).
- Do not output YAML, full Promptfoo config, or executable code — only the JSON object below.

Prioritization:
- Prefer key assertions over comprehensive coverage.
- If both deterministic and rubric assertions are useful, include both.
- If the prompt is mostly subjective, favor llm-rubric.
- If the prompt has clear hard constraints, include deterministic assertions where they fit best.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"suggestions":[{"type":"deterministic"|"llm","assertionType":"<type>","metric":"<short label>","value":"<string>","explanation":"<brief why>"}]}

Field rules:
- "type": "deterministic" for objective checks; "llm" for rubric/judge-style checks.
- assertionType MUST be one of: ${allTypesList}
  (Deterministic examples: ${deterministicList}; LLM judges: ${llmList}.)
- For deterministic types, "value" is the literal, pattern, or structured check the evaluator needs.
- For llm-rubric (and similar), "value" is the grading rubric with explicit PASS/FAIL criteria.
- "metric" is a concise label for results tables.
- "explanation" is one short sentence on what this assertion checks.`;

  let completion: Response;
  try {
    completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: vendor === 'openai' ? model : `${vendor}/${model}`,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userBlock },
        ],
      }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `OpenAI request failed: ${message}` },
      { status: 502 },
    );
  }

  const completionJson: unknown = await completion.json();
  if (!completion.ok) {
    const errMsg =
      typeof completionJson === 'object' &&
      completionJson !== null &&
      'error' in completionJson &&
      typeof (completionJson as { error?: { message?: string } }).error?.message === 'string'
        ? (completionJson as { error: { message: string } }).error.message
        : completion.statusText;
    return NextResponse.json(
      { error: `OpenAI error: ${errMsg}` },
      { status: 502 },
    );
  }

  const choices = (
    completionJson as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
    }
  ).choices;
  const firstChoice = choices?.[0];
  const text = firstChoice?.message?.content;

  if (!text || typeof text !== 'string') {
    return NextResponse.json(
      { error: 'OpenAI returned an empty completion.' },
      { status: 502 },
    );
  }

  if (firstChoice?.finish_reason === 'length') {
    return NextResponse.json(
      { error: 'Model response was cut off. Try reducing the number of prompts or assertions.' },
      { status: 502 },
    );
  }

  let envelope: z.infer<typeof openAiEnvelopeSchema>;
  try {
    const parsed = JSON.parse(stripJsonFence(text));
    envelope = openAiEnvelopeSchema.parse(parsed);
  } catch (e) {
    console.error('[generate-assertions] Failed to parse model output:', text, e);
    return NextResponse.json(
      { error: 'Could not parse model output as JSON.' },
      { status: 502 },
    );
  }

  const normalized = envelope.suggestions.map(normalizeSuggestion).slice(0, 5);

  return NextResponse.json({ suggestions: normalized });
}
