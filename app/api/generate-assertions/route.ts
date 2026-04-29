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

const requirementSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  category: z.string(),
  priority: z.string().optional(),
  assertionStrategy: z.string().optional(),
  recommendedAssertionType: z.string().optional(),
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
  requirements: z.array(requirementSchema).optional(),
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
  coveredRequirementIndices: z.array(z.number()).optional(),
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
  coveredRequirementIndices?: number[];
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
    coveredRequirementIndices: s.coveredRequirementIndices,
  };
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return m ? m[1]!.trim() : t;
}

function buildRequirementDrivenPrompt(
  allTypesList: string,
  deterministicList: string,
  llmList: string,
): string {
  return `You are generating evaluation assertions for Promptfoo based on user-confirmed requirements.

The user has reviewed and confirmed a prioritized set of requirements. Each requirement includes a priority (critical, important, or optional) and a recommended assertion strategy (deterministic, code, llm-judge, or none-yet).

Your job is to produce a compact, high-signal assertion set. Think in terms of coverage of critical behaviors, not exhaustive literal coverage.

## Core principles

1. COMPACT SET: Target 2–4 deterministic assertions for hard rules + 1–3 LLM judge assertions for nuanced quality. Rarely exceed 7 total. More assertions does not mean better coverage.
2. RESPECT PRIORITIES: Critical requirements MUST be covered. Important requirements SHOULD be covered. Optional requirements should only be covered if they naturally merge with a critical/important assertion.
3. RESPECT RECOMMENDED STRATEGY AND TYPE: Each requirement has a recommended assertion strategy and may have a specific recommendedAssertionType (e.g. "contains", "regex", "llm-rubric"). Use the recommended type as your starting point. Deviate only when the recommended type is clearly not feasible for that requirement.
4. MERGE WHEN POSSIBLE: If two requirements test closely related concerns, a single well-crafted assertion can cover both. State which requirements it covers in the explanation.
5. ONE CONCERN PER ASSERTION: Each assertion validates exactly one coherent concern. Never combine unrelated checks into a compound assertion. Related sub-checks (e.g. "no legal advice" and "no medical advice" → one not-contains-any) are fine because they test the same concern.
6. DETERMINISTIC FIRST: Deterministic checks are your first line of defense. If something can be verified with code, do NOT use an LLM judge. Only fall back to llm-rubric when deterministic validation is genuinely not feasible.
7. NO DUPLICATES: Check existing assertions and do not regenerate anything that already exists.
8. SKIP "none-yet": Requirements with assertionStrategy "none-yet" should NOT produce assertions unless the user explicitly included them.

## Deterministic assertion quality

A strong deterministic assertion is: precise (checks something exact), fast (no model call), reliable (same input → same result), debuggable (failure reason is obvious).

Rules:
- Use for: required fields present, JSON validity, exact values, keyword presence/absence, regex patterns, word count, length constraints.
- PREFER STRUCTURE OVER TEXT MATCHING: Use is-json or contains-json to validate structure. Parse and check fields explicitly rather than doing fragile substring matches in long text.
- Each assertion checks ONE thing. Bad: "response contains keyword AND is short AND formatted correctly." Good: one assertion per condition.
- FAIL LOUDLY: The assertion definition itself should make it obvious what failed and where. If you need to "interpret" a failure, the assertion is too vague.
- Be strict on structure, flexible on wording. Too strict = brittle tests and false negatives. Too loose = useless tests.

## LLM-as-judge assertion quality

A strong LLM judge is: narrow (evaluates one thing only), binary (pass or fail, not vague scoring), explicit (clear rules for success and failure), explainable (always gives a short reason).

Rules:
- ONE CRITERION PER JUDGE. Each judge answers a single question (e.g. "Did the model follow the instruction?", "Is the output factually correct?", "Is the format valid?"). Never combine multiple concerns into one judge.
- USE PASS / FAIL, NOT SCORES. Avoid 1-to-5 or 1-to-10 scales. Binary verdicts make results easier to interpret, easier to debug, and more consistent across runs.
- DEFINE A CLEAR RUBRIC. The judge must know exactly what "good" and "bad" mean. Include explicit Pass criteria and Fail criteria. Be concrete, not abstract. Bad: "The answer should be good and relevant." Good: "The answer must include all requested fields and not introduce unrelated content."
- REQUIRE A SHORT CRITIQUE. Always ask the judge to explain what failed and why. This is critical for debugging, improving prompts, and refining assertions later.
- KEEP IT FOCUSED. Tell the judge what NOT to evaluate. Example: "Do not evaluate tone or formatting unless it directly affects the criterion." This reduces noise and inconsistency.
- USE STRUCTURED OUTPUT. Force a predictable JSON format:
  {"verdict": "PASS" | "FAIL", "critique": "short explanation"}
- Rubric template for "value" field:
  "Evaluate whether the response [specific criterion]. PASS if [concrete, observable pass condition]. FAIL if [concrete, observable fail condition]. Do not evaluate [out-of-scope aspects]. Respond with JSON: {\"verdict\": \"PASS\" or \"FAIL\", \"critique\": \"one sentence explaining your judgment\"}."

## Decision filter

Before creating each assertion, ask:
1. Is this materially important? (Would failure matter in real usage?)
2. Is it distinct from other assertions? (Not overlapping?)
3. Can it be tested in a clear, unambiguous way? (Not vague?)
If any answer is no, skip it.

## Output rules
- Produce assertions in "suggestions" array. If requirements are empty or unusable, return {"suggestions":[]}.
- Never use assertion types "javascript" or "python".
- Do not output YAML, Promptfoo config, or executable code.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"suggestions":[{"type":"deterministic"|"llm","assertionType":"<type>","metric":"<short label>","value":"<string>","explanation":"<brief why — mention which requirement(s) this covers>","coveredRequirementIndices":[0]}]}

Field rules:
- "type": "deterministic" for objective checks; "llm" for rubric/judge-style checks.
- assertionType MUST be one of: ${allTypesList}
  (Deterministic: ${deterministicList}; LLM judges: ${llmList}.)
- For deterministic types, "value" is the literal, pattern, or structured check the evaluator needs.
- For llm-rubric, "value" MUST be a complete rubric following the template above (criterion, pass condition, fail condition, exclusions, JSON output instruction).
- "metric" is a concise label for results tables.
- "explanation" is one short sentence on which requirement(s) this assertion covers.
- "coveredRequirementIndices" is an array of zero-based indices into the confirmed requirements array, indicating which requirement(s) this assertion validates. Every assertion MUST cover at least one requirement. If an assertion covers multiple merged requirements, list all their indices.`;
}

function buildLegacyPrompt(
  allTypesList: string,
  deterministicList: string,
  llmList: string,
): string {
  return `You are generating evaluation assertions for the provided prompt(s).

Analyze the prompt exactly as given in the user message. Do not rewrite, summarize, or improve the prompt text.

Your goal is a short, high-value set of assertions for Promptfoo to evaluate outputs from this prompt.

Focus on:
1. The prompt's core instructions and constraints
2. The most important output quality expectations
3. The most likely failure modes or edge cases
4. Criteria that are practical and useful for evaluation

Generation rules:
- Produce only 3 to 5 assertions in "suggestions" (never more than 5). If the prompt content is missing or unusable, return {"suggestions":[]}.
- Each assertion checks exactly ONE thing. Never combine multiple conditions into a compound assertion.
- Include only the most important assertions; avoid overlap, duplication, and low-value checks.
- Prefer assertions directly useful in real evaluation workflows.

## Deterministic assertions — your first line of defense

Use deterministic checks whenever something can be verified with code. Do NOT use an LLM judge for things a simple check can handle.

Good candidates: required fields present, JSON validity, exact values, keyword presence/absence, length constraints, regex patterns, word count.

Quality rules:
- PREFER STRUCTURE OVER TEXT MATCHING. Use is-json or contains-json to validate structure. Parse and check fields explicitly rather than fragile substring matches in long text.
- Each assertion checks one thing only. Bad: "response contains keyword AND is short AND formatted correctly." Good: one assertion per condition.
- FAIL LOUDLY. The assertion itself should make it obvious what failed. If you'd need to "interpret" the failure, it's too vague.
- Be strict on structure, flexible on wording. Too strict = brittle tests and false negatives. Too loose = useless tests.
- Do not force deterministic assertions if the prompt does not support them.

## LLM-as-judge assertions — for meaning and quality

Use llm-rubric only when the check genuinely requires semantic understanding (tone, clarity, helpfulness, completeness, instruction-following, safety).

Quality rules:
- ONE CRITERION PER JUDGE. Each judge answers a single question (e.g. "Did the model follow the instruction?", "Is the output factually correct?"). Never combine multiple concerns.
- USE PASS / FAIL, NOT SCORES. Avoid 1-to-5 or 1-to-10 scales. Binary verdicts are easier to interpret, debug, and more consistent across runs.
- DEFINE A CLEAR RUBRIC. Include explicit pass criteria and fail criteria. Be concrete, not abstract. Bad: "The answer should be good and relevant." Good: "The answer must include all requested fields and not introduce unrelated content."
- REQUIRE A SHORT CRITIQUE. Always require the judge to explain what failed and why — critical for debugging.
- KEEP IT FOCUSED. Tell the judge what NOT to evaluate. Example: "Do not evaluate tone or formatting unless it directly affects the criterion." This reduces noise and inconsistency.
- USE STRUCTURED OUTPUT. The rubric must instruct the judge to return: {"verdict": "PASS" or "FAIL", "critique": "short explanation"}.
- Rubric template for "value" field:
  "Evaluate whether the response [specific criterion]. PASS if [concrete, observable pass condition]. FAIL if [concrete, observable fail condition]. Do not evaluate [out-of-scope aspects]. Respond with JSON: {\"verdict\": \"PASS\" or \"FAIL\", \"critique\": \"one sentence explaining your judgment\"}."

## Type selection

- Never use assertion types "javascript" or "python" (no code-execution assertions).
- Do not output YAML, full Promptfoo config, or executable code — only the JSON object below.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"suggestions":[{"type":"deterministic"|"llm","assertionType":"<type>","metric":"<short label>","value":"<string>","explanation":"<brief why>"}]}

Field rules:
- "type": "deterministic" for objective checks; "llm" for rubric/judge-style checks.
- assertionType MUST be one of: ${allTypesList}
  (Deterministic: ${deterministicList}; LLM judges: ${llmList}.)
- For deterministic types, "value" is the literal, pattern, or structured check the evaluator needs.
- For llm-rubric, "value" MUST be a complete rubric following the template above (criterion, pass condition, fail condition, exclusions, JSON output instruction).
- "metric" is a concise label for results tables.
- "explanation" is one short sentence on what this assertion checks.`;
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

  const { prompts, existingAssertions, requirements, testsSummary, instructions, vendor: requestedVendor, model: requestedModel, temperature: requestedTemperature } = parsed.data;
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

  const hasRequirements = requirements && requirements.length > 0;

  const actionableRequirements = hasRequirements
    ? requirements.filter((r) => {
        const priority = r.priority ?? 'important';
        const strategy = r.assertionStrategy ?? 'llm-judge';
        return priority !== 'optional' && strategy !== 'none-yet';
      })
    : [];

  const optionalRequirements = hasRequirements
    ? requirements.filter((r) => {
        const priority = r.priority ?? 'important';
        const strategy = r.assertionStrategy ?? 'llm-judge';
        return priority === 'optional' || strategy === 'none-yet';
      })
    : [];

  const indexedActionableRequirements = actionableRequirements.map((r, i) => ({
    index: i,
    id: r.id,
    text: r.text,
    category: r.category,
    priority: r.priority,
    assertionStrategy: r.assertionStrategy,
    recommendedAssertionType: r.recommendedAssertionType,
  }));

  const requirementsBlock = hasRequirements
    ? [
        '## Confirmed requirements (generate assertions for these — use "index" to reference them in coveredRequirementIndices)',
        JSON.stringify(indexedActionableRequirements, null, 2),
        ...(optionalRequirements.length > 0
          ? [
              '',
              '## Optional / deferred requirements (do NOT generate assertions for these unless they naturally merge with a critical/important requirement above)',
              JSON.stringify(optionalRequirements, null, 2),
            ]
          : []),
      ].join('\n')
    : '';

  const userBlock = [
    '## Prompt content (provided for context — do not rewrite, summarize, or improve it)',
    JSON.stringify(prompts, null, 2),
    '',
    requirementsBlock,
    '',
    '## Existing assertions (avoid overlap with these)',
    JSON.stringify(existingAssertions, null, 2),
    testsSummary ? `\n## Dataset / tests\n${testsSummary}` : '',
    instructions ? `\n## Extra instructions from the user\n${instructions}` : '',
  ].join('\n');

  const systemPrompt = hasRequirements
    ? buildRequirementDrivenPrompt(allTypesList, deterministicList, llmList)
    : buildLegacyPrompt(allTypesList, deterministicList, llmList);

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
    const raw = JSON.parse(stripJsonFence(text));
    envelope = openAiEnvelopeSchema.parse(raw);
  } catch (e) {
    console.error('[generate-assertions] Failed to parse model output:', text, e);
    return NextResponse.json(
      { error: 'Could not parse model output as JSON.' },
      { status: 502 },
    );
  }

  const maxAssertions = hasRequirements
    ? Math.min(Math.max(actionableRequirements.length, 3), 7)
    : 5;
  const normalized = envelope.suggestions.map((s) => {
    const n = normalizeSuggestion(s);
    const sourceRequirementIds = n.coveredRequirementIndices
      ?.map((idx) => actionableRequirements[idx]?.id)
      .filter((id): id is string => !!id);
    return {
      type: n.type,
      assertionType: n.assertionType,
      metric: n.metric,
      value: n.value,
      explanation: n.explanation,
      sourceRequirementIds: sourceRequirementIds?.length ? sourceRequirementIds : undefined,
    };
  }).slice(0, maxAssertions);

  return NextResponse.json({ suggestions: normalized });
}
