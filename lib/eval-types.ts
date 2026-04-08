export interface PromptConfig {
  promptId: number | string;
  versionId: number | string;
  label?: string;
}

export interface JudgeProviderConfig {
  id: string;
  config: {
    max_tokens: number;
    temperature: number;
    headers?: Record<string, string>;
  };
}

export type AssertionType =
  | 'equals'
  | 'contains'
  | 'icontains'
  | 'contains-all'
  | 'contains-any'
  | 'icontains-all'
  | 'icontains-any'
  | 'starts-with'
  | 'regex'
  | 'not-equals'
  | 'not-contains'
  | 'not-icontains'
  | 'not-contains-all'
  | 'not-contains-any'
  | 'not-icontains-any'
  | 'not-starts-with'
  | 'not-regex'
  | 'is-json'
  | 'contains-json'
  | 'javascript'
  | 'python'
  | 'llm-rubric'
  | 'model-graded-factuality'
  | 'model-graded-closedqa'
  | 'answer-relevance'
  | 'cost'
  | 'latency'
  | 'levenshtein'
  | 'similar'
  | 'wordCount';

export interface Assertion {
  id: string;
  type: AssertionType;
  metric?: string;
  value: string | string[] | number;
  threshold?: number;
  provider?: JudgeProviderConfig;
}

export interface TestCase {
  id: string;
  description?: string;
  vars: Record<string, string>;
  assert?: Assertion[];
}

export interface ProviderConfig {
  id: string;
  config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    transformResponse?: string;
    body: Record<string, string>;
  };
}

export interface EvalConfig {
  description: string;
  prompts: PromptConfig[];
  providers?: ProviderConfig[];
  defaultTest: {
    options?: {
      provider?: JudgeProviderConfig;
    };
    assert: Assertion[];
  };
  tests: TestCase[] | string;
  rawYaml?: string;
  unsupportedSections?: Record<string, unknown>;
}

export interface SavedConfig {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  config: EvalConfig;
}

export interface EvalRun {
  id: string;
  configId: string;
  configName: string;
  passedCount: number;
  totalCount: number;
  passRate: number;
  runAt: string;
  runBy: string;
}

export const DETERMINISTIC_ASSERTIONS: AssertionType[] = [
  'equals',
  'contains',
  'icontains',
  'contains-all',
  'contains-any',
  'icontains-all',
  'icontains-any',
  'starts-with',
  'regex',
  'not-equals',
  'not-contains',
  'not-icontains',
  'not-contains-all',
  'not-contains-any',
  'not-icontains-any',
  'not-starts-with',
  'not-regex',
  'is-json',
  'contains-json',
  'javascript',
  'python',
  'wordCount',
];

export const LLM_ASSERTIONS: AssertionType[] = [
  'llm-rubric',
  'model-graded-factuality',
  'model-graded-closedqa',
  'answer-relevance',
];

export const ASSERTION_INFO: Record<AssertionType, { description: string; whenToUse: string; example: string }> = {
  'equals': {
    description: 'Checks if output exactly matches expected value',
    whenToUse: 'When you know the exact expected output',
    example: 'equals: "Hello World"',
  },
  'contains': {
    description: 'Checks if output contains a substring (case-sensitive)',
    whenToUse: 'When checking for presence of specific text',
    example: 'contains: "error"',
  },
  'icontains': {
    description: 'Checks if output contains a substring (case-insensitive)',
    whenToUse: 'When checking for presence of text regardless of case',
    example: 'icontains: "hello"',
  },
  'contains-all': {
    description: 'Checks if output contains all specified substrings',
    whenToUse: 'When multiple terms must all be present',
    example: 'contains-all: ["name", "email"]',
  },
  'contains-any': {
    description: 'Checks if output contains any of the specified substrings',
    whenToUse: 'When at least one term should be present',
    example: 'contains-any: ["yes", "agree"]',
  },
  'icontains-all': {
    description: 'Case-insensitive check for all substrings',
    whenToUse: 'When multiple terms must be present regardless of case',
    example: 'icontains-all: ["Name", "Email"]',
  },
  'icontains-any': {
    description: 'Case-insensitive check for any substring',
    whenToUse: 'When any term should be present regardless of case',
    example: 'icontains-any: ["Yes", "Agree"]',
  },
  'starts-with': {
    description: 'Checks if output starts with specified text',
    whenToUse: 'When validating output prefix',
    example: 'starts-with: "Dear"',
  },
  'regex': {
    description: 'Checks if output matches a regular expression',
    whenToUse: 'When validating format or pattern',
    example: 'regex: "^\\d{3}-\\d{4}$"',
  },
  'not-equals': {
    description: 'Checks output does not exactly match value',
    whenToUse: 'When ensuring output differs from specific text',
    example: 'not-equals: "N/A"',
  },
  'not-contains': {
    description: 'Checks output does not contain substring',
    whenToUse: 'When ensuring specific text is absent',
    example: 'not-contains: "error"',
  },
  'not-icontains': {
    description: 'Case-insensitive check that substring is absent',
    whenToUse: 'When ensuring text is absent regardless of case',
    example: 'not-icontains: "ERROR"',
  },
  'not-contains-all': {
    description: 'Checks that not all specified substrings are present',
    whenToUse: 'When at least one term should be missing',
    example: 'not-contains-all: ["error", "fail"]',
  },
  'not-contains-any': {
    description: 'Checks that none of the specified substrings are present',
    whenToUse: 'When none of the terms should be present',
    example: 'not-contains-any: ["error", "fail"]',
  },
  'not-icontains-any': {
    description: 'Case-insensitive check that no substrings are present',
    whenToUse: 'For banned terms/words check',
    example: 'not-icontains-any: ["free", "discount"]',
  },
  'not-starts-with': {
    description: 'Checks output does not start with text',
    whenToUse: 'When validating output does not have specific prefix',
    example: 'not-starts-with: "Error:"',
  },
  'not-regex': {
    description: 'Checks output does not match regex pattern',
    whenToUse: 'When ensuring output does not match a pattern',
    example: 'not-regex: "\\berror\\b"',
  },
  'is-json': {
    description: 'Checks if output is valid JSON',
    whenToUse: 'When expecting JSON output',
    example: 'is-json: true',
  },
  'contains-json': {
    description: 'Checks if output contains valid JSON',
    whenToUse: 'When JSON may be embedded in other text',
    example: 'contains-json: true',
  },
  'javascript': {
    description: 'Custom JavaScript validation function',
    whenToUse: 'For complex custom validation logic',
    example: 'javascript: "output.length < 100"',
  },
  'python': {
    description: 'Custom Python validation function',
    whenToUse: 'For complex custom validation in Python',
    example: 'python: "len(output) < 100"',
  },
  'llm-rubric': {
    description: 'LLM judges output against a rubric',
    whenToUse: 'For subjective quality checks (tone, clarity, etc.)',
    example: 'llm-rubric: "Output should be professional and helpful"',
  },
  'model-graded-factuality': {
    description: 'LLM checks factual accuracy',
    whenToUse: 'When verifying factual correctness',
    example: 'model-graded-factuality: true',
  },
  'model-graded-closedqa': {
    description: 'LLM grades closed-ended QA',
    whenToUse: 'For evaluating QA responses',
    example: 'model-graded-closedqa: true',
  },
  'answer-relevance': {
    description: 'LLM checks answer relevance to question',
    whenToUse: 'When ensuring answer addresses the question',
    example: 'answer-relevance: true',
  },
  'cost': {
    description: 'Checks if cost is below threshold',
    whenToUse: 'When monitoring API costs',
    example: 'cost: 0.01',
  },
  'latency': {
    description: 'Checks if latency is below threshold (ms)',
    whenToUse: 'When monitoring response time',
    example: 'latency: 5000',
  },
  'levenshtein': {
    description: 'Checks edit distance from expected output',
    whenToUse: 'When allowing minor variations',
    example: 'levenshtein: 5',
  },
  'similar': {
    description: 'Checks semantic similarity to expected output',
    whenToUse: 'When meaning matters more than exact wording',
    example: 'similar: "Expected output text"',
  },
  'wordCount': {
    description: 'Checks word count is within range',
    whenToUse: 'When enforcing length constraints',
    example: 'wordCount: { min: 10, max: 100 }',
  },
};

export const SAMPLE_PROMPT_PROJECTS = [
  { id: '{{currentPromptProjectId}}', name: 'Current Prompt Project' },
  { id: '1234', name: 'Sample Project 1234' },
  { id: '2735', name: 'CRM Email Project' },
];

export const SAMPLE_PROMPT_VERSIONS: Record<string, { id: string; name: string }[]> = {
  '{{currentPromptProjectId}}': [
    { id: '{{currentPromptVersionId}}', name: 'Current Version' },
  ],
  '1234': [
    { id: '56789', name: 'Version 56789 (Latest)' },
    { id: '56781', name: 'Version 56781' },
    { id: '56782', name: 'Version 56782' },
  ],
  '2735': [
    { id: '14631', name: 'Version 14631 (Latest)' },
    { id: '17905', name: 'Version 17905 (Anthropic)' },
    { id: '17903', name: 'Version 17903 (OpenAI)' },
  ],
};

export const DEFAULT_EVAL_CONFIG: EvalConfig = {
  description: 'Test configs for FAQ',
  prompts: [
    {
      promptId: 2735,
      versionId: 17905,
      label: 'anthropic',
    },
  ],
  providers: [
    {
      id: 'https',
      config: {
        url: '{{promptManagementApiBaseUrl}}/api/v3/eval-runs/execute-prompt',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        transformResponse: `(json) => {
  let output = json.choices[0].message?.content;
  if (!output) {
      const choices = json.choices;
      const toolCalls = choices.length > 0 && choices[0].message && choices[0].message.tool_calls;
      const funcArg = (toolCalls && toolCalls.length > 0 && toolCalls[0].function.arguments) || '{}';
      output = JSON.parse(funcArg);
  }
  const usage = json.usage || {};
  return {
      output: output,
      tokenUsage: {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens,
      },
      cost: usage.cost && usage.cost.toFixed(10) || undefined,
  };
}`,
        body: {
          promptInfo: '{{prompt}}',
          'variables.user_message': '{{user_message | dump}}',
        },
      },
    },
  ],
  defaultTest: {
    options: {
      provider: {
        id: 'openai:gpt-4.1-2025-04-14',
        config: {
          max_tokens: 3000,
          temperature: 0,
          headers: {
            'X-Vendor': 'openai',
            'X-Model': 'gpt-4.1-2025-04-14',
            'X-Source': 'promptfoo',
            'X-Usecase': 'Veronica test prompts',
          },
        },
      },
    },
    assert: [
      {
        id: 'assert-1',
        type: 'llm-rubric',
        metric: 'Evaluate subject line',
        value: 'Judge the model output for a JustAnswer follow-up email subject line. Input conversation: {{user_message}}.  PASS only if: - subject_line is in friendly, formal tone and recaps essence of user\'s issue. Otherwise always FAIL.',
      },
    ],
  },
  tests: [
    {
      id: 'test-1',
      vars: {
        user_message: `Customer: We have a depression era (we think) glass chest. Can you help us identify and valuate? Expert: Hello! My name is Mark P and I am a certified appraiser of art, antiques, coins and collectibles with over 20 years of major international auction house experience. Thanks for the pictures. I'll begin researching and be back to you in a bit. Customer: Good Day Mark. More Images to follow Customer: File attached (LPZZP6Z) Customer: File attached (T41QTMS) Customer: In Pristine condition Expert: Thanks for the pictures! I'll begin researching and be back to you in a bit. Customer: No worries Expert: I am not finding an identification for the maker of the vanity/trinket/jewelry box, but see attached a past auction sale of one included in a group lot. Realistic sale value for it is between $30 and $70 in the auction or online market.I hope you find this helpful and informative. I'll be happy to answer any questions or provide sale option guidance if you would like. Just let me know! All my best, Mark P Customer: Thank you, there was is no mark on the item. Customer: Your efforts are appreciated Customer: Have a great day and a greater weekend Expert: You are very welcome! Glad to be of assistance.I will be happy to assist with more items (fine art, antiques, books, coins, currency, collectibles), but please start a new question from the main Just Answer webpage. No additional costs – just how it works. You can request me by putting "For Mark P" or @MarkP at the beginning of your first response or using this link (but still put @MarkP at the beginning): https://www.justanswer.com/antiques/expert-mark-pAll my best, Mark P`,
      },
    },
  ],
};

export const JUDGE_MODELS = [
  { id: 'openai:gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
  { id: 'openai:gpt-4.1-2025-04-14', name: 'GPT-4.1' },
  { id: 'anthropic:claude-opus-4', name: 'Claude Opus 4' },
  { id: 'anthropic:claude-sonnet-4', name: 'Claude Sonnet 4' },
];

export const ASSERTION_CATEGORIES: Record<string, AssertionType[]> = {
  'String Matching': ['equals', 'contains', 'icontains', 'contains-all', 'contains-any', 'icontains-all', 'icontains-any', 'starts-with', 'regex'],
  'Negation': ['not-equals', 'not-contains', 'not-icontains', 'not-contains-all', 'not-contains-any', 'not-icontains-any', 'not-starts-with', 'not-regex'],
  'JSON': ['is-json', 'contains-json'],
  'Custom Code': ['javascript', 'python'],
  'LLM as Judge': ['llm-rubric', 'model-graded-factuality', 'model-graded-closedqa', 'answer-relevance'],
  'Metrics': ['cost', 'latency', 'levenshtein', 'similar', 'wordCount'],
};
