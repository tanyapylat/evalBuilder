import { NextResponse } from 'next/server';
import { z } from 'zod';

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
      value: z.union([z.string(), z.array(z.string()), z.number()]).optional(),
    }),
  ),
  variables: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(10).optional(),
  model: z.string().optional(),
  examples: z.array(z.record(z.string(), z.string())).optional(),
});

const testCaseSchema = z.object({
  title: z.string(),
  category: z.string(),
  variables: z.record(z.string(), z.string()),
  expected_focus: z.string(),
});

const openAiEnvelopeSchema = z.object({
  test_cases: z.array(testCaseSchema),
});

function stripJsonFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return m ? m[1]!.trim() : t;
}

function buildSystemPrompt(count: number) {
  return `You are generating test cases for a Promptfoo evaluation setup.

Analyze the provided prompt and, if present, the evaluation assertions.

Your task is to create exactly ${count} high-value test case${count === 1 ? '' : 's'} that help validate how well the prompt performs across normal usage, edge cases, and likely failure scenarios.

Inputs:
1. Prompt
2. Assertions or eval criteria, if provided
3. Optional user-provided examples to guide style and domain

Instructions:
- Use the prompt exactly as provided
- Use eval assertions to guide coverage when they are present
- If user-provided examples are present, use them as references for style, domain, and complexity
- Generate exactly ${count} test case${count === 1 ? '' : 's'}
- Balance the set across:
  - normal flows
  - edge cases
  - ambiguous inputs
  - adversarial or failure-prone cases
  - boundary conditions
- Make test cases realistic and useful for evaluation
- Prioritize coverage of the most important behaviors, constraints, and risks in the prompt
- Include cases that help reveal likely weaknesses or regressions
- Do not generate duplicate or low-value cases

Coverage guidance:
Consider including test cases for:
- typical expected user requests
- minimal-input cases
- missing-context cases
- conflicting or ambiguous instructions
- unsafe or disallowed requests if relevant
- formatting or structure challenges
- length extremes
- unusual but plausible user phrasing
- cases targeting known assertions or rubric dimensions
- cases likely to trigger failure modes

If assertions are present:
- Make sure the test set meaningfully exercises them
- Include cases that test both success and failure conditions where useful
- Reflect deterministic constraints if they exist
- Reflect rubric-based quality expectations if they exist

Output requirements:
- Return exactly ${count} test case${count === 1 ? '' : 's'}
- Each test case must be distinct
- Each test case should include:
  1. short title
  2. category
  3. input value(s) for the prompt variable(s)
  4. expected focus

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"test_cases":[{"title":"<short title>","category":"<category>","variables":{"<variable_name>":"<input value>"},"expected_focus":"<what this test validates>"}]}

The "variables" object keys MUST match the prompt's template variable names exactly. Generate realistic, diverse input values for each variable.`;
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

  const { prompts, existingAssertions, variables, count: requestedCount, model: requestedModel, examples } = parsed.data;
  const count = Math.min(Math.max(requestedCount ?? 10, 1), 10);
  const model =
    requestedModel?.trim() || process.env.OPENAI_TEST_GEN_MODEL?.trim() || 'gpt-4.1-2025-04-14';

  const userBlock = [
    '## Prompt content (analyze as written)',
    JSON.stringify(prompts, null, 2),
    '',
    existingAssertions.length > 0
      ? `## Assertions / eval criteria\n${JSON.stringify(existingAssertions, null, 2)}`
      : '## Assertions\nNone provided.',
    '',
    variables && variables.length > 0
      ? `## Template variables\nThe prompt uses these variables: ${variables.join(', ')}\nGenerate input values for these exact variable names.`
      : '',
    examples && examples.length > 0
      ? `\n## User-provided examples\nUse these as representative examples to guide the style, length, and domain of generated test inputs:\n${JSON.stringify(examples, null, 2)}`
      : '',
    `\n## Number of test cases to generate: ${count}`,
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
        model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt(count) },
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

  const choices = (completionJson as { choices?: Array<{ message?: { content?: string } }> })
    .choices;
  const text = choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    return NextResponse.json(
      { error: 'OpenAI returned an empty completion.' },
      { status: 502 },
    );
  }

  let envelope: z.infer<typeof openAiEnvelopeSchema>;
  try {
    envelope = openAiEnvelopeSchema.parse(JSON.parse(stripJsonFence(text)));
  } catch {
    return NextResponse.json(
      { error: 'Could not parse model output as JSON.' },
      { status: 502 },
    );
  }

  const testCases = envelope.test_cases.slice(0, count);

  return NextResponse.json({ testCases });
}
