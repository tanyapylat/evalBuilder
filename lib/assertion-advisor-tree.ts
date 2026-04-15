export interface AdvisorResult {
  recommendation: 'deterministic' | 'llm_judge';
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
  q1: {
    id: 'q1',
    question: 'Is there a single clearly correct answer, format, or structure?',
    description: 'Examples: exact wording, JSON schema, required fields, regex match',
    answers: [
      { label: 'Yes', nextId: 'q2a' },
      { label: 'No', nextId: 'q2b' },
    ],
  },
  q2a: {
    id: 'q2a',
    question: 'Can this be verified with code or rules, without human-like interpretation?',
    description:
      'Examples: exact match, contains / does not contain, field presence, schema validation, numeric range',
    answers: [
      { label: 'Yes', nextId: 'result_det_a' },
      { label: 'No', nextId: 'q3' },
    ],
  },
  q2b: {
    id: 'q2b',
    question: 'Are multiple different answers likely to be acceptable as long as they are good?',
    description:
      'Examples: paraphrases, open-ended summaries, alternative valid phrasings',
    answers: [
      { label: 'Yes', nextId: 'q3' },
      { label: 'No', nextId: 'q4' },
    ],
  },
  q3: {
    id: 'q3',
    question:
      'Does this check require judging meaning, quality, tone, relevance, or completeness?',
    description:
      'Examples: helpfulness, politeness, correctness of explanation, whether response addressed the user\u2019s intent',
    answers: [
      { label: 'Yes', nextId: 'result_llm_a' },
      { label: 'No', nextId: 'q4' },
    ],
  },
  q4: {
    id: 'q4',
    question: 'Are you mainly checking strict constraints or compliance rules?',
    description:
      'Examples: must include disclaimer, must not mention a forbidden phrase, must follow exact format, must return valid JSON',
    answers: [
      { label: 'Yes', nextId: 'result_det_b' },
      { label: 'No', nextId: 'q5' },
    ],
  },
  q5: {
    id: 'q5',
    question:
      'Would a human need to read the output and make a judgment call to decide whether it passes?',
    description: 'Think about whether a simple script could evaluate this, or it requires reading comprehension',
    answers: [
      { label: 'Yes', nextId: 'result_llm_b' },
      { label: 'No', nextId: 'q6' },
    ],
  },
  q6: {
    id: 'q6',
    question: 'Is the main concern semantic quality rather than structural correctness?',
    description:
      'Semantic quality = meaning, usefulness, appropriateness. Structural = format, schema, presence of fields',
    answers: [
      { label: 'Yes', nextId: 'result_llm_c' },
      { label: 'No', nextId: 'result_det_d' },
    ],
  },

  // ── Terminal: Deterministic ───────────────────────────────────────────────
  result_det_a: {
    id: 'result_det_a',
    result: {
      recommendation: 'deterministic',
      confidence: 'high',
      reason:
        'The expected output can be verified with explicit rules or code without interpretation.',
      examples: [
        'equals',
        'contains',
        'not-contains',
        'regex',
        'is-json',
        'javascript custom assertion',
      ],
      suggestedNextStep: 'Start with strict rule-based assertions.',
    },
  },
  result_det_b: {
    id: 'result_det_b',
    result: {
      recommendation: 'deterministic',
      confidence: 'high',
      reason:
        'You are checking strict constraints, required structure, or compliance rules.',
      examples: [
        'contains required disclaimer',
        'does not contain banned phrase',
        'matches schema',
        'regex validation',
        'custom JavaScript check',
      ],
      suggestedNextStep: 'Start with strict rule-based assertions.',
    },
  },
  result_det_c: {
    id: 'result_det_c',
    result: {
      recommendation: 'deterministic',
      confidence: 'medium',
      reason:
        'This appears rule-based and does not require subjective interpretation.',
      examples: [
        'field presence',
        'exact value checks',
        'format validation',
        'range checks',
      ],
      suggestedNextStep: 'Start with strict rule-based assertions.',
    },
  },
  result_det_d: {
    id: 'result_det_d',
    result: {
      recommendation: 'deterministic',
      confidence: 'medium',
      reason:
        'The primary need is structural or logic-based validation.',
      examples: [
        'JSON schema',
        'regex',
        'contains / not contains',
        'custom JS assertion',
      ],
      suggestedNextStep: 'Start with strict rule-based assertions.',
    },
  },

  // ── Terminal: LLM Judge ────────────────────────────────────────────────────
  result_llm_a: {
    id: 'result_llm_a',
    result: {
      recommendation: 'llm_judge',
      confidence: 'high',
      reason:
        'The assertion depends on semantic understanding, judgment, or subjective quality.',
      examples: [
        'Does the answer address the user intent?',
        'Is the explanation correct and helpful?',
        'Is the tone empathetic and professional?',
        'Does the response miss any important information?',
      ],
      suggestedNextStep: 'Start with a rubric-based semantic evaluation.',
    },
  },
  result_llm_b: {
    id: 'result_llm_b',
    result: {
      recommendation: 'llm_judge',
      confidence: 'high',
      reason:
        'A human would need to read the output and make a judgment call.',
      examples: [
        'relevance',
        'helpfulness',
        'completeness',
        'clarity',
        'tone',
      ],
      suggestedNextStep: 'Start with a rubric-based semantic evaluation.',
    },
  },
  result_llm_c: {
    id: 'result_llm_c',
    result: {
      recommendation: 'llm_judge',
      confidence: 'medium',
      reason:
        'The main evaluation depends on semantic quality rather than strict rules.',
      examples: [
        'semantic correctness',
        'instruction-following quality',
        'response usefulness',
        'appropriateness of tone',
      ],
      suggestedNextStep: 'Start with a rubric-based semantic evaluation.',
    },
  },
};

export const QUESTION_IDS = ['q1', 'q2a', 'q2b', 'q3', 'q4', 'q5', 'q6'];

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
