'use client';

import type { Assertion, TestCase, PromptConfig } from './eval-types';
import { generateId } from './yaml-utils';

// Types for AI suggestions
export interface AssertionSuggestion {
  id: string;
  type: 'deterministic' | 'llm';
  assertionType: Assertion['type'];
  metric: string;
  value: string;
  explanation: string;
}

export interface AssertionImprovement {
  original: Assertion;
  suggested: Assertion;
  explanation: string;
}

export interface TestCaseSuggestion {
  id: string;
  vars: Record<string, string>;
  tag: 'normal' | 'edge';
  description: string;
  category?: string;
  expectedFocus?: string;
}

// Mock AI generation functions - in production these would call an actual AI API
export function generateAssertionSuggestions(
  prompts: PromptConfig[],
  tests: TestCase[] | string,
  existingAssertions: Assertion[]
): AssertionSuggestion[] {
  // Simulate AI-generated suggestions based on context
  const suggestions: AssertionSuggestion[] = [
    {
      id: generateId(),
      type: 'deterministic',
      assertionType: 'contains',
      metric: 'Response includes greeting',
      value: 'Hello',
      explanation: 'Checks that the response includes a greeting to maintain professional tone.',
    },
    {
      id: generateId(),
      type: 'deterministic',
      assertionType: 'not-contains',
      metric: 'No profanity',
      value: 'profanity_list',
      explanation: 'Ensures the response does not contain inappropriate language.',
    },
    {
      id: generateId(),
      type: 'llm',
      assertionType: 'llm-rubric',
      metric: 'Helpful response',
      value: 'Evaluate if the response is helpful, accurate, and addresses the user\'s question. PASS if the response provides relevant information. FAIL if it is off-topic or unhelpful.',
      explanation: 'Uses LLM-as-judge to assess overall response quality and helpfulness.',
    },
    {
      id: generateId(),
      type: 'llm',
      assertionType: 'llm-rubric',
      metric: 'Professional tone',
      value: 'Evaluate if the response maintains a professional, friendly tone appropriate for customer service. PASS if professional. FAIL if too casual or rude.',
      explanation: 'Checks for appropriate professional communication style.',
    },
    {
      id: generateId(),
      type: 'deterministic',
      assertionType: 'regex',
      metric: 'Valid formatting',
      value: '^[A-Z].*[.!?]$',
      explanation: 'Validates that the response starts with a capital letter and ends with punctuation.',
    },
  ];

  // Filter out suggestions similar to existing assertions
  return suggestions.filter(s => 
    !existingAssertions.some(a => a.metric === s.metric || a.type === s.assertionType && a.value === s.value)
  ).slice(0, 5);
}

export function improveAssertion(assertion: Assertion): AssertionImprovement {
  // Simulate AI improvement
  const improved = { ...assertion, id: generateId() };
  let explanation = '';

  if (assertion.type === 'contains') {
    improved.type = 'icontains';
    explanation = 'Changed to case-insensitive matching for more robust checking.';
  } else if (assertion.type === 'equals') {
    improved.type = 'similar';
    improved.threshold = 0.9;
    explanation = 'Changed to similarity matching to handle minor variations in output.';
  } else if (assertion.type === 'llm-rubric' && assertion.value) {
    improved.value = `${assertion.value}\n\nProvide a confidence score from 0-100 and explain your reasoning.`;
    explanation = 'Added request for confidence score and reasoning for better traceability.';
  } else {
    explanation = 'No improvements suggested for this assertion type.';
  }

  return { original: assertion, suggested: improved, explanation };
}

export function convertAssertion(assertion: Assertion): AssertionImprovement {
  const isLlm = ['llm-rubric', 'model-graded-factuality', 'model-graded-closedqa', 'answer-relevance'].includes(assertion.type);
  const converted = { ...assertion, id: generateId() };
  let explanation = '';

  if (isLlm) {
    // Convert LLM to deterministic
    converted.type = 'contains';
    converted.value = '';
    explanation = 'Converted to deterministic assertion. You\'ll need to specify the exact value to check for.';
  } else {
    // Convert deterministic to LLM
    converted.type = 'llm-rubric';
    converted.value = `Evaluate if the output satisfies the following criteria: ${assertion.value || 'meets expectations'}. PASS if criteria is met, FAIL otherwise.`;
    explanation = 'Converted to LLM-as-judge for more flexible evaluation.';
  }

  return { original: assertion, suggested: converted, explanation };
}

export function explainAssertion(assertion: Assertion): string {
  const typeExplanations: Record<string, string> = {
    'equals': 'Checks for exact string match. Use when you need the output to be exactly a specific value.',
    'contains': 'Checks if the output contains a specific substring. Case-sensitive.',
    'icontains': 'Case-insensitive version of contains. More forgiving for variations in capitalization.',
    'regex': 'Uses a regular expression pattern. Powerful for complex pattern matching.',
    'not-contains': 'Ensures the output does NOT contain a specific substring. Good for banned content.',
    'llm-rubric': 'Uses an LLM to judge the output against a rubric. Best for subjective quality assessment.',
    'similar': 'Checks semantic similarity using embeddings. Good for paraphrase detection.',
    'contains-all': 'Checks that all specified values are present in the output.',
    'contains-any': 'Checks that at least one of the specified values is present.',
  };

  const typeExplanation = typeExplanations[assertion.type] || `Assertion type: ${assertion.type}`;
  const metricInfo = assertion.metric ? `\n\nMetric name: "${assertion.metric}" - This label will appear in evaluation results.` : '';
  const valueInfo = assertion.value ? `\n\nCurrent value/rubric: "${String(assertion.value).substring(0, 100)}${String(assertion.value).length > 100 ? '...' : ''}"` : '';

  return `${typeExplanation}${metricInfo}${valueInfo}`;
}

export function generateTestCases(
  prompts: PromptConfig[],
  assertions: Assertion[],
  existingTests: TestCase[]
): TestCaseSuggestion[] {
  // Simulate AI-generated test cases
  const suggestions: TestCaseSuggestion[] = [
    {
      id: generateId(),
      vars: {
        user_message: 'Customer: Hi, I need help with my order #12345. It hasn\'t arrived yet and it\'s been 2 weeks. Expert: I\'d be happy to help you track down your order.',
      },
      tag: 'normal',
      description: 'Standard customer service inquiry about delayed order',
    },
    {
      id: generateId(),
      vars: {
        user_message: 'Customer: Thanks for your help! Expert: You\'re welcome! Is there anything else I can help you with?',
      },
      tag: 'normal',
      description: 'Simple thank you exchange',
    },
    {
      id: generateId(),
      vars: {
        user_message: 'Customer: I HATE YOUR SERVICE! THIS IS THE WORST EXPERIENCE EVER! Expert: I\'m sorry to hear about your frustration.',
      },
      tag: 'edge',
      description: 'Angry customer with emotional language',
    },
  ];

  return suggestions;
}

export function generateEdgeCases(
  prompts: PromptConfig[],
  assertions: Assertion[],
  existingTests: TestCase[]
): TestCaseSuggestion[] {
  // Simulate AI-generated edge cases
  const suggestions: TestCaseSuggestion[] = [
    {
      id: generateId(),
      vars: {
        user_message: '',
      },
      tag: 'edge',
      description: 'Empty input - tests handling of missing data',
    },
    {
      id: generateId(),
      vars: {
        user_message: 'Customer: ' + 'a'.repeat(10000),
      },
      tag: 'edge',
      description: 'Very long input - tests character limit handling',
    },
    {
      id: generateId(),
      vars: {
        user_message: 'Customer: 你好，我需要帮助 Expert: Hello! How can I help?',
      },
      tag: 'edge',
      description: 'Multi-language input - tests internationalization',
    },
    {
      id: generateId(),
      vars: {
        user_message: 'Customer: <script>alert("xss")</script> Expert: How can I help?',
      },
      tag: 'edge',
      description: 'Potential XSS - tests input sanitization',
    },
    {
      id: generateId(),
      vars: {
        user_message: 'Customer: What is 1+1? Expert: 2',
      },
      tag: 'edge',
      description: 'Off-topic question - tests response boundaries',
    },
  ];

  return suggestions;
}
