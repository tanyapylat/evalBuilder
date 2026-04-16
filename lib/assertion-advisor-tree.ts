export interface AdvisorResult {
  recommendation: 'deterministic' | 'llm_judge' | 'code';
  confidence: 'high' | 'medium';
  reason: string;
  examples: string[];
  suggestedNextStep: string;
}

export interface QuestionNode {
  id: string;
  question: string;
  description: string;
  answers: { label: string; nextId: string }[];
}

export interface ResultNode {
  id: string;
  result: AdvisorResult;
}

export type TreeNode = QuestionNode | ResultNode;

export function isResultNode(node: TreeNode): node is ResultNode {
  return 'result' in node;
}

const TREE_NODES: Record<string, TreeNode> = {
  // ── Questions ──────────────────────────────────────────────────────────────

  q1: {
    id: 'q1',
    question: 'Can the output be evaluated with exact rules — no interpretation needed?',
    description:
      'Think: keyword checks, regex, JSON structure, numeric thresholds, field presence — anything a script can verify without "reading" the text.',
    answers: [
      { label: 'Yes, exact rules work', nextId: 'q2' },
      { label: 'No, it needs interpretation', nextId: 'q3' },
    ],
  },

  q2: {
    id: 'q2',
    question: 'Do the rules require multi-step logic, data parsing, or computation?',
    description:
      'Examples: validate specific JSON fields, combine several conditions, check math in the response, parse a table, or call a helper function.',
    answers: [
      { label: 'Yes, I need custom logic', nextId: 'result_code_a' },
      { label: 'No, a simple check is enough', nextId: 'result_det_a' },
    ],
  },

  q3: {
    id: 'q3',
    question: 'Does a human need to judge meaning, quality, tone, or relevance?',
    description:
      'Examples: Is the response helpful? Is the tone professional? Did it address the question correctly?',
    answers: [
      { label: 'Yes', nextId: 'q4' },
      { label: 'No', nextId: 'q5' },
    ],
  },

  q4: {
    id: 'q4',
    question: 'Could you write a rubric describing what makes a good vs. bad response?',
    description:
      'A rubric like "PASS if polite, accurate, and addresses the question" works well for LLM judges. If you\'d rather write code to score specific criteria, choose the second option.',
    answers: [
      { label: 'Yes, a rubric works', nextId: 'result_llm_a' },
      { label: 'I\'d rather write code to score it', nextId: 'result_code_b' },
    ],
  },

  q5: {
    id: 'q5',
    question: 'Are you checking structural constraints or compliance rules?',
    description:
      'Examples: must include a disclaimer, must not mention a competitor, must return valid JSON, must follow a specific format.',
    answers: [
      { label: 'Yes', nextId: 'q6' },
      { label: 'No, it\'s more about overall quality', nextId: 'result_llm_b' },
    ],
  },

  q6: {
    id: 'q6',
    question: 'Are the rules complex enough to need a script?',
    description:
      'Choose "Yes" if you need to combine multiple conditions, parse nested data, or do calculations. Choose "No" if a single contains / regex / JSON check covers it.',
    answers: [
      { label: 'Yes, a script is needed', nextId: 'result_code_c' },
      { label: 'No, built-in checks cover it', nextId: 'result_det_b' },
    ],
  },

  // ── Terminal: Deterministic ────────────────────────────────────────────────

  result_det_a: {
    id: 'result_det_a',
    result: {
      recommendation: 'deterministic',
      confidence: 'high',
      reason:
        'Your check can be handled by a simple built-in rule — no custom code or LLM judgment required.',
      examples: [
        'equals / icontains',
        'contains / not-contains',
        'regex',
        'is-json / contains-json',
        'cost / latency thresholds',
      ],
      suggestedNextStep:
        'Add a Deterministic assertion and pick the matching check type from the dropdown.',
    },
  },

  result_det_b: {
    id: 'result_det_b',
    result: {
      recommendation: 'deterministic',
      confidence: 'high',
      reason:
        'Your structural or compliance rules can be handled with built-in assertion types.',
      examples: [
        'contains required disclaimer',
        'not-contains banned phrase',
        'regex for format validation',
        'is-json for valid JSON',
        'similar for fuzzy match',
      ],
      suggestedNextStep:
        'Add a Deterministic assertion. Use "contains" for required phrases, "regex" for patterns, or "is-json" for structure.',
    },
  },

  // ── Terminal: Custom Code ──────────────────────────────────────────────────

  result_code_a: {
    id: 'result_code_a',
    result: {
      recommendation: 'code',
      confidence: 'high',
      reason:
        'Your validation needs multi-step logic, data parsing, or computation that goes beyond simple pattern matching.',
      examples: [
        'Parse JSON and check specific field values',
        'Validate that a number in the response is within range',
        'Combine multiple conditions (length + keywords + format)',
        'Check that a list in the output is sorted or deduplicated',
        'Call a helper function or external API',
      ],
      suggestedNextStep:
        'Add a Custom Code assertion. Choose JavaScript for quick inline checks, or Python if you prefer its libraries.',
    },
  },

  result_code_b: {
    id: 'result_code_b',
    result: {
      recommendation: 'code',
      confidence: 'medium',
      reason:
        'You want to programmatically score or evaluate criteria that are hard to express as a simple rubric.',
      examples: [
        'Score based on multiple weighted criteria',
        'Check readability metrics (sentence length, vocabulary)',
        'Validate code output by parsing / running it',
        'Compare structured data field-by-field',
        'Custom scoring with a numeric threshold',
      ],
      suggestedNextStep:
        'Add a Custom Code assertion. Your function receives the LLM output and can return true/false, a numeric score, or a { pass, score, reason } object.',
    },
  },

  result_code_c: {
    id: 'result_code_c',
    result: {
      recommendation: 'code',
      confidence: 'high',
      reason:
        'Your compliance rules involve enough complexity (multiple conditions, nested data, calculations) that a script is the cleanest approach.',
      examples: [
        'Ensure JSON has required fields with correct types',
        'Validate that response follows a multi-part template',
        'Check multiple forbidden patterns in one pass',
        'Verify calculations or numeric constraints',
        'Parse and validate structured output (CSV, XML, tables)',
      ],
      suggestedNextStep:
        'Add a Custom Code assertion. JavaScript runs inline; Python can leverage libraries like json, re, or csv.',
    },
  },

  // ── Terminal: LLM Judge ────────────────────────────────────────────────────

  result_llm_a: {
    id: 'result_llm_a',
    result: {
      recommendation: 'llm_judge',
      confidence: 'high',
      reason:
        'Your evaluation requires semantic understanding — a rubric-based LLM judge is the best fit.',
      examples: [
        'llm-rubric — custom rubric you define',
        'model-graded-closedqa — factual Q&A grading',
        'model-graded-factuality — fact checking',
        'answer-relevance — is the answer on-topic?',
      ],
      suggestedNextStep:
        'Add an LLM as Judge assertion and write a clear rubric describing pass/fail criteria.',
    },
  },

  result_llm_b: {
    id: 'result_llm_b',
    result: {
      recommendation: 'llm_judge',
      confidence: 'medium',
      reason:
        'The check is about overall quality rather than specific rules — an LLM judge can assess this holistically.',
      examples: [
        'helpfulness',
        'clarity and coherence',
        'completeness',
        'tone and professionalism',
        'instruction-following quality',
      ],
      suggestedNextStep:
        'Add an LLM as Judge assertion with a rubric focused on the quality dimensions you care about.',
    },
  },
};

export const QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

export function getNode(id: string): TreeNode {
  const node = TREE_NODES[id];
  if (!node) throw new Error(`Unknown advisor node: ${id}`);
  return node;
}

export function getStartNode(): TreeNode {
  return TREE_NODES['q1'];
}

export function getQuestionNumber(id: string): number {
  const idx = QUESTION_IDS.indexOf(id);
  return idx === -1 ? 0 : idx + 1;
}
