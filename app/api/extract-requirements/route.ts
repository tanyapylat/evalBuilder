import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  REQUIREMENT_CATEGORIES,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STRATEGIES,
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
  vendor: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const categorySet = new Set<string>(REQUIREMENT_CATEGORIES);
const prioritySet = new Set<string>(REQUIREMENT_PRIORITIES);
const strategySet = new Set<string>(REQUIREMENT_STRATEGIES);

const VALID_ASSERTION_TYPES = new Set<string>([
  ...DETERMINISTIC_ASSERTIONS,
  ...LLM_ASSERTIONS,
]);

const STRATEGY_TO_DEFAULT_TYPE: Record<string, AssertionType> = {
  deterministic: 'contains',
  code: 'javascript',
  'llm-judge': 'llm-rubric',
};

const rawRequirementSchema = z.object({
  text: z.string(),
  category: z.string().transform((v) => {
    const lower = v.toLowerCase().trim();
    return categorySet.has(lower) ? lower : 'behavior';
  }),
  priority: z.string().transform((v) => {
    const lower = v.toLowerCase().trim();
    return prioritySet.has(lower) ? lower : 'important';
  }),
  assertionStrategy: z.string().transform((v) => {
    const lower = v.toLowerCase().trim().replace(/_/g, '-');
    return strategySet.has(lower) ? lower : 'llm-judge';
  }),
  recommendedAssertionType: z.string().optional().transform((v) => {
    if (!v) return undefined;
    const lower = v.toLowerCase().trim().replace(/_/g, '-');
    return VALID_ASSERTION_TYPES.has(lower) ? lower : undefined;
  }),
});

const openAiEnvelopeSchema = z.object({
  requirements: z.array(rawRequirementSchema),
});

function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return m ? m[1]!.trim() : t;
}

const SYSTEM_PROMPT = `You are extracting structured requirements from a prompt specification.

Your task has two phases performed in sequence within a single response.

## Phase 1: Extraction

Review the prompt and identify ALL instructions, constraints, and expectations it contains or implies. Do not skip anything. Consider:
- What is the system fundamentally trying to achieve?
- What must always be true in a good output?
- What must never happen?
- Which rules are explicitly stated vs implied?

## Phase 2: Consolidation

Merge the raw extractions into a compact set of non-overlapping, atomic requirements. This is the critical step.

Consolidation rules:
- Related instructions should be merged into a single requirement when they test the same concern. Example: "be concise", "use short sentences", "avoid repetition" → one requirement about conciseness and brevity.
- Each requirement must represent exactly one testable behavioral concern.
- The final set should have 3 to 8 requirements. Never fewer than 3 and never more than 10.
- A complex prompt does NOT mean more requirements. It means better-organized requirements.

For each consolidated requirement, assign:

### category (exactly one of):
- structure: Output shape, sections, ordering, JSON schema, required fields.
- constraint: Hard rules — length limits, banned content, required disclaimers, allowed values.
- tone: Voice, register, politeness, formality, empathy.
- correctness: Factual accuracy, logical consistency, calculation accuracy.
- format: Formatting rules — markdown, bullet points, numbering, capitalization, punctuation.
- safety: PII handling, refusal of disallowed requests, competitor mentions, harmful content.
- content: Required information, topics that must be covered, completeness of answer.
- behavior: Instruction-following, edge-case handling, fallback behavior, conditional logic.

### priority (exactly one of):
- critical: Failure makes the output unsafe or unusable. Hard constraints, safety rules, required output structure. Users would notice immediately.
- important: Failure degrades quality significantly. Task success criteria, key content requirements, core behavioral rules.
- optional: Failure is noticeable but tolerable. Stylistic preferences, nice-to-have quality aspects. Not worth an assertion in an MVP eval.

### assertionStrategy (exactly one of):
- deterministic: Can be checked with exact match, contains, regex, JSON validation, word count, or similar programmatic checks. These are the first line of defense — if something can be verified with code, don't use an LLM. Good candidates: required fields present, JSON validity, exact values, keyword presence/absence, length constraints, formatting rules.
- code: Needs custom JavaScript/Python logic (complex parsing, calculations, multi-field validation, multi-step conditions that go beyond simple pattern matching).
- llm-judge: Requires subjective judgment that a simple rule cannot capture — tone, quality, helpfulness, instruction-following nuance, factual correctness where the answer isn't predetermined. Each judge should answer a single question (e.g. "Is the response helpful?" or "Is the output factually correct?" — never both combined).
- none-yet: Not worth asserting on yet — too vague, too low priority, or not practically testable.

Priority assignment guidance — for each candidate requirement, ask:
1. Would failure on this be unsafe or make the output unusable? → critical
2. Would failure degrade quality in a way users notice quickly? → important
3. Is this more of a polish/style concern? → optional

Strategy assignment guidance:
- DETERMINISTIC FIRST: Prefer deterministic whenever a requirement can be verified by string matching, regex, JSON validation, structure checks, or field presence. Deterministic checks are precise, fast, reliable, and debuggable.
- Prefer structure over text matching: if the output is JSON, prefer schema/field validation over substring matching.
- Use code only when deterministic types are insufficient but the check is still objective (e.g. multi-field validation, calculations).
- Use llm-judge ONLY when the check genuinely requires semantic understanding. Each judge requirement should map to one narrow question.
- Use none-yet for optional requirements or anything too vague to test concretely.

Target distribution: most prompts should produce 2–4 deterministic + 1–3 judge requirements. If you are producing more than 8, you are not consolidating enough.

### recommendedAssertionType (optional, recommended):
When assertionStrategy is "deterministic", recommend a specific type from: equals, contains, icontains, contains-all, contains-any, icontains-all, icontains-any, starts-with, regex, not-equals, not-contains, not-icontains, not-contains-all, not-contains-any, not-icontains-any, not-starts-with, not-regex, is-json, contains-json, wordCount.
When assertionStrategy is "code", recommend: javascript or python.
When assertionStrategy is "llm-judge", recommend: llm-rubric (default), model-graded-factuality, model-graded-closedqa, or answer-relevance.
When assertionStrategy is "none-yet", omit this field.

Choose the most appropriate specific assertion type:
- Structure checks (JSON output) → is-json or contains-json
- Required keywords/phrases → contains, icontains, contains-all, contains-any
- Banned/prohibited content → not-contains, not-icontains, not-contains-any, not-icontains-any
- Format/pattern validation → regex, starts-with
- Length constraints → wordCount
- Exact match → equals
- Subjective quality/tone → llm-rubric
- Factual accuracy → model-graded-factuality
- Complex multi-step validation → javascript

Do not rewrite, summarize, or improve the prompt text itself.
Do not generate assertions — only extract and consolidate requirements.
If the prompt is empty or unusable, return {"requirements":[]}.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"requirements":[{"text":"<specific testable behavior>","category":"<category>","priority":"<critical|important|optional>","assertionStrategy":"<deterministic|code|llm-judge|none-yet>","recommendedAssertionType":"<specific type or omit>"}]}`;

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

  const { prompts, vendor: requestedVendor, model: requestedModel, temperature: requestedTemperature } = parsed.data;
  const vendor = requestedVendor?.trim() || 'openai';
  const model =
    requestedModel?.trim() || process.env.OPENAI_ASSERTION_MODEL?.trim() || 'gpt-4.1-2025-04-14';
  const temperature = requestedTemperature ?? 0.3;

  const userBlock = [
    '## Prompt content (analyze as written — do not rewrite or improve)',
    JSON.stringify(prompts, null, 2),
  ].join('\n');

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
          { role: 'system', content: SYSTEM_PROMPT },
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
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
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
      { error: 'Model response was cut off. Try reducing the number of prompts.' },
      { status: 502 },
    );
  }

  let envelope: z.infer<typeof openAiEnvelopeSchema>;
  try {
    const raw = JSON.parse(stripJsonFence(text));
    envelope = openAiEnvelopeSchema.parse(raw);
  } catch (e) {
    console.error('[extract-requirements] Failed to parse model output:', text, e);
    return NextResponse.json(
      { error: 'Could not parse model output as JSON.' },
      { status: 502 },
    );
  }

  const requirements = envelope.requirements.slice(0, 10).map((r) => ({
    ...r,
    recommendedAssertionType:
      r.recommendedAssertionType ??
      STRATEGY_TO_DEFAULT_TYPE[r.assertionStrategy] ??
      undefined,
  }));

  return NextResponse.json({ requirements });
}
