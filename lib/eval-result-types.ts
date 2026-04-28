export interface EvalResultSummary {
  evalId: string;
  description: string;
  runAt: string;
  runBy: string;
  promptIds: { promptId: number | string; versionId: number | string; label?: string }[];
  providerCount: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  avgScore: number;
  totalCost: number;
  avgLatencyMs: number;
  avgTokens: number;
}

export interface TestCaseResult {
  id: string;
  testIndex: number;
  vars: Record<string, string>;
  outputs: ProviderOutput[];
}

export interface ProviderOutput {
  providerId: string;
  promptLabel?: string;
  rawOutput: string;
  status: 'pass' | 'fail' | 'error';
  score: number;
  namedScores: Record<string, number>;
  graderReason: string;
  assertions: AssertionResult[];
  metadata: OutputMetadata;
}

export interface AssertionResult {
  metric: string;
  pass: boolean;
  score: number;
  type: string;
  value: string;
  reason: string;
}

export interface OutputMetadata {
  tokensPrompt: number;
  tokensCompletion: number;
  tokensTotal: number;
  latencyMs: number;
  tokensPerSecond: number;
  cost: number;
}

export interface EvalResultsResponse {
  summary: EvalResultSummary;
  results: TestCaseResult[];
}
