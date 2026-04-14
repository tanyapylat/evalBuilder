'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import type { EvalConfig, Assertion, TestCase, PromptConfig, JudgeProviderConfig, SavedConfig, EvalRun, EvalRunStatus } from './eval-types';
import { DEFAULT_EVAL_CONFIG } from './eval-types';
import { configToYaml, generateId } from './yaml-utils';

/** Maps the numeric status ID returned by the PM API to our EvalRunStatus enum. */
function mapStatusId(statusId: number | null | undefined): EvalRunStatus {
  switch (statusId) {
    case 1: return 'Complete';
    case 2: return 'InProgress';
    case 3: return 'Error';
    case 4: return 'InQueue';
    default: return 'InQueue';
  }
}

type EvalAction =
  | { type: 'SET_CONFIG'; payload: EvalConfig }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'ADD_PROMPT'; payload: PromptConfig }
  | { type: 'UPDATE_PROMPT'; payload: { index: number; prompt: PromptConfig } }
  | { type: 'DELETE_PROMPT'; payload: number }
  | { type: 'SET_JUDGE_PROVIDER'; payload: JudgeProviderConfig }
  | { type: 'ADD_ASSERTION'; payload: Assertion }
  | { type: 'UPDATE_ASSERTION'; payload: { index: number; assertion: Assertion } }
  | { type: 'DELETE_ASSERTION'; payload: number }
  | { type: 'DUPLICATE_ASSERTION'; payload: number }
  | { type: 'REORDER_ASSERTIONS'; payload: Assertion[] }
  | { type: 'REPLACE_ALL_ASSERTIONS'; payload: Assertion[] }
  | { type: 'ADD_TEST'; payload: TestCase }
  | { type: 'BATCH_ADD_TESTS'; payload: TestCase[] }
  | { type: 'UPDATE_TEST'; payload: { index: number; test: TestCase } }
  | { type: 'DELETE_TEST'; payload: number }
  | { type: 'DELETE_TESTS_BY_IDS'; payload: Set<string> }
  | { type: 'DELETE_ALL_TESTS' }
  | { type: 'REPLACE_ALL_TESTS'; payload: TestCase[] }
  | { type: 'SET_TESTS_URL'; payload: string }
  | { type: 'SET_RAW_YAML'; payload: string }
  | { type: 'RESET' };

function evalReducer(state: EvalConfig, action: EvalAction): EvalConfig {
  switch (action.type) {
    case 'SET_CONFIG':
      return action.payload;

    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };

    case 'ADD_PROMPT':
      return { ...state, prompts: [...state.prompts, action.payload] };

    case 'UPDATE_PROMPT':
      const updatedPrompts = [...state.prompts];
      updatedPrompts[action.payload.index] = action.payload.prompt;
      return { ...state, prompts: updatedPrompts };

    case 'DELETE_PROMPT':
      return { ...state, prompts: state.prompts.filter((_, i) => i !== action.payload) };

    case 'SET_JUDGE_PROVIDER':
      return {
        ...state,
        defaultTest: {
          ...state.defaultTest,
          options: {
            ...state.defaultTest.options,
            provider: action.payload,
          },
        },
      };

    case 'ADD_ASSERTION':
      return {
        ...state,
        defaultTest: {
          ...state.defaultTest,
          assert: [...state.defaultTest.assert, action.payload],
        },
      };

    case 'UPDATE_ASSERTION':
      const updatedAssertions = [...state.defaultTest.assert];
      updatedAssertions[action.payload.index] = action.payload.assertion;
      return {
        ...state,
        defaultTest: {
          ...state.defaultTest,
          assert: updatedAssertions,
        },
      };

    case 'DELETE_ASSERTION':
      return {
        ...state,
        defaultTest: {
          ...state.defaultTest,
          assert: state.defaultTest.assert.filter((_, i) => i !== action.payload),
        },
      };

    case 'DUPLICATE_ASSERTION':
      const assertionToDupe = state.defaultTest.assert[action.payload];
      if (!assertionToDupe) return state;
      return {
        ...state,
        defaultTest: {
          ...state.defaultTest,
          assert: [...state.defaultTest.assert, { ...assertionToDupe, id: generateId() }],
        },
      };

    case 'REORDER_ASSERTIONS':
      return {
        ...state,
        defaultTest: {
          ...state.defaultTest,
          assert: action.payload,
        },
      };

    case 'REPLACE_ALL_ASSERTIONS':
      return {
        ...state,
        defaultTest: {
          ...state.defaultTest,
          assert: action.payload,
        },
      };

    case 'ADD_TEST':
      if (typeof state.tests === 'string') {
        return { ...state, tests: [action.payload] };
      }
      return { ...state, tests: [...state.tests, action.payload] };

    case 'BATCH_ADD_TESTS':
      if (typeof state.tests === 'string') {
        return { ...state, tests: action.payload };
      }
      return { ...state, tests: [...state.tests, ...action.payload] };

    case 'UPDATE_TEST':
      if (typeof state.tests === 'string') return state;
      const updatedTests = [...state.tests];
      updatedTests[action.payload.index] = action.payload.test;
      return { ...state, tests: updatedTests };

    case 'DELETE_TEST':
      if (typeof state.tests === 'string') return state;
      return { ...state, tests: state.tests.filter((_, i) => i !== action.payload) };

    case 'DELETE_TESTS_BY_IDS':
      if (typeof state.tests === 'string') return state;
      return { ...state, tests: state.tests.filter((t) => !action.payload.has(t.id)) };

    case 'DELETE_ALL_TESTS':
      return { ...state, tests: [] };

    case 'REPLACE_ALL_TESTS':
      return { ...state, tests: action.payload };

    case 'SET_TESTS_URL':
      return { ...state, tests: action.payload };

    case 'SET_RAW_YAML':
      return { ...state, rawYaml: action.payload };

    case 'RESET':
      return DEFAULT_EVAL_CONFIG;

    default:
      return state;
  }
}

interface EvalContextType {
  config: EvalConfig;
  yaml: string;
  configName: string;
  setConfigName: (name: string) => void;
  savedConfigs: SavedConfig[];
  evalRuns: EvalRun[];
  activeRunJobId: string | null;
  activeConfigId: string | null;
  setActiveConfigId: (id: string | null) => void;
  designatedConfigId: string | null;
  setDesignatedConfigId: (id: string | null) => void;
  deleteSavedConfig: (id: string) => void;
  dispatch: React.Dispatch<EvalAction>;
  setDescription: (description: string) => void;
  addPrompt: (prompt?: Partial<PromptConfig>) => void;
  updatePrompt: (index: number, prompt: PromptConfig) => void;
  deletePrompt: (index: number) => void;
  setJudgeProvider: (provider: JudgeProviderConfig) => void;
  addAssertion: (assertion?: Partial<Assertion>) => void;
  updateAssertion: (index: number, assertion: Assertion) => void;
  deleteAssertion: (index: number) => void;
  duplicateAssertion: (index: number) => void;
  reorderAssertions: (assertions: Assertion[]) => void;
  replaceAllAssertions: (assertions: Assertion[]) => void;
  addTest: (test?: Partial<TestCase>) => void;
  batchAddTests: (tests: TestCase[]) => void;
  updateTest: (index: number, test: TestCase) => void;
  deleteTest: (index: number) => void;
  deleteTestsByIds: (ids: Set<string>) => void;
  deleteAllTests: () => void;
  replaceAllTests: (tests: TestCase[]) => void;
  setTestsUrl: (url: string) => void;
  setRawYaml: (yaml: string) => void;
  saveConfig: () => void;
  loadConfig: (id: string) => void;
  createNewConfig: () => void;
  reset: () => void;
  isRunning: boolean;
  runEval: () => Promise<void>;
}

const EvalContext = createContext<EvalContextType | null>(null);

// Sample data for demo
const SAMPLE_CONFIGS: SavedConfig[] = [
  {
    id: 'config-1',
    name: 'FAQ Test Config',
    description: 'Test configs for FAQ',
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-15T14:00:00Z',
    config: DEFAULT_EVAL_CONFIG,
  },
];

const SAMPLE_RUNS: EvalRun[] = [
  { id: 'run-1', configId: 'config-1', configName: '#2508', passedCount: 1, totalCount: 2, passRate: 50, runAt: '2024-12-15T13:42:00Z', runBy: 'VeronicaK-admin' },
  { id: 'run-2', configId: 'config-1', configName: '#2508', passedCount: 1, totalCount: 2, passRate: 50, runAt: '2024-12-15T13:42:00Z', runBy: 'rkurchak-admin' },
  { id: 'run-3', configId: 'config-1', configName: '#2508', passedCount: 9, totalCount: 19, passRate: 47.4, runAt: '2024-12-08T15:15:00Z', runBy: 'VeronicaK-admin' },
  { id: 'run-4', configId: 'config-1', configName: '#2508', passedCount: 9, totalCount: 19, passRate: 47.4, runAt: '2024-12-08T03:48:00Z', runBy: 'VeronicaK-admin' },
  { id: 'run-5', configId: 'config-1', configName: '#1958', passedCount: 9, totalCount: 19, passRate: 47.4, runAt: '2024-12-08T02:32:00Z', runBy: 'VeronicaK-admin' },
];

export function EvalProvider({ children }: { children: React.ReactNode }) {
  const [config, dispatch] = useReducer(evalReducer, DEFAULT_EVAL_CONFIG);
  const [configName, setConfigName] = React.useState('FAQ Test Config');
  const [savedConfigs, setSavedConfigs] = React.useState<SavedConfig[]>(SAMPLE_CONFIGS);
  const [evalRuns, setEvalRuns] = React.useState<EvalRun[]>(SAMPLE_RUNS);
  const [activeRunJobId, setActiveRunJobId] = React.useState<string | null>(null);
  const [activeConfigId, setActiveConfigId] = React.useState<string | null>('config-1');
  const pollingIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const [designatedConfigId, setDesignatedConfigId] = React.useState<string | null>('config-1');
  const [isRunning, setIsRunning] = React.useState(false);

  const yaml = useMemo(() => configToYaml(config), [config]);

  const setDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_DESCRIPTION', payload: description });
  }, []);

  const addPrompt = useCallback((prompt?: Partial<PromptConfig>) => {
    dispatch({
      type: 'ADD_PROMPT',
      payload: {
        promptId: '{{currentPromptProjectId}}',
        versionId: '{{currentPromptVersionId}}',
        ...prompt,
      } as PromptConfig,
    });
  }, []);

  const updatePrompt = useCallback((index: number, prompt: PromptConfig) => {
    dispatch({ type: 'UPDATE_PROMPT', payload: { index, prompt } });
  }, []);

  const deletePrompt = useCallback((index: number) => {
    dispatch({ type: 'DELETE_PROMPT', payload: index });
  }, []);

  const setJudgeProvider = useCallback((provider: JudgeProviderConfig) => {
    dispatch({ type: 'SET_JUDGE_PROVIDER', payload: provider });
  }, []);

  const addAssertion = useCallback((assertion?: Partial<Assertion>) => {
    dispatch({
      type: 'ADD_ASSERTION',
      payload: {
        id: generateId(),
        type: 'equals',
        value: '',
        ...assertion,
      } as Assertion,
    });
  }, []);

  const updateAssertion = useCallback((index: number, assertion: Assertion) => {
    dispatch({ type: 'UPDATE_ASSERTION', payload: { index, assertion } });
  }, []);

  const deleteAssertion = useCallback((index: number) => {
    dispatch({ type: 'DELETE_ASSERTION', payload: index });
  }, []);

  const duplicateAssertion = useCallback((index: number) => {
    dispatch({ type: 'DUPLICATE_ASSERTION', payload: index });
  }, []);

  const reorderAssertions = useCallback((assertions: Assertion[]) => {
    dispatch({ type: 'REORDER_ASSERTIONS', payload: assertions });
  }, []);

  const replaceAllAssertions = useCallback((assertions: Assertion[]) => {
    dispatch({ type: 'REPLACE_ALL_ASSERTIONS', payload: assertions });
  }, []);

  const addTest = useCallback((test?: Partial<TestCase>) => {
    dispatch({
      type: 'ADD_TEST',
      payload: {
        id: generateId(),
        vars: {},
        ...test,
      } as TestCase,
    });
  }, []);

  const batchAddTests = useCallback((tests: TestCase[]) => {
    dispatch({ type: 'BATCH_ADD_TESTS', payload: tests });
  }, []);

  const updateTest = useCallback((index: number, test: TestCase) => {
    dispatch({ type: 'UPDATE_TEST', payload: { index, test } });
  }, []);

  const deleteTest = useCallback((index: number) => {
    dispatch({ type: 'DELETE_TEST', payload: index });
  }, []);

  const deleteTestsByIds = useCallback((ids: Set<string>) => {
    dispatch({ type: 'DELETE_TESTS_BY_IDS', payload: ids });
  }, []);

  const deleteAllTests = useCallback(() => {
    dispatch({ type: 'DELETE_ALL_TESTS' });
  }, []);

  const replaceAllTests = useCallback((tests: TestCase[]) => {
    dispatch({ type: 'REPLACE_ALL_TESTS', payload: tests });
  }, []);

  const setTestsUrl = useCallback((url: string) => {
    dispatch({ type: 'SET_TESTS_URL', payload: url });
  }, []);

  const setRawYaml = useCallback((yamlStr: string) => {
    dispatch({ type: 'SET_RAW_YAML', payload: yamlStr });
  }, []);

  const saveConfig = useCallback(() => {
    const id = activeConfigId || generateId();
    const now = new Date().toISOString();
    const existingIndex = savedConfigs.findIndex(c => c.id === id);
    
    const newConfig: SavedConfig = {
      id,
      name: configName,
      description: config.description,
      createdAt: existingIndex >= 0 ? savedConfigs[existingIndex].createdAt : now,
      updatedAt: now,
      config,
    };

    if (existingIndex >= 0) {
      const updated = [...savedConfigs];
      updated[existingIndex] = newConfig;
      setSavedConfigs(updated);
    } else {
      setSavedConfigs([...savedConfigs, newConfig]);
      setActiveConfigId(id);
    }
  }, [activeConfigId, configName, config, savedConfigs]);

  const loadConfig = useCallback((id: string) => {
    const saved = savedConfigs.find(c => c.id === id);
    if (saved) {
      dispatch({ type: 'SET_CONFIG', payload: saved.config });
      setConfigName(saved.name);
      setActiveConfigId(id);
    }
  }, [savedConfigs]);

  const createNewConfig = useCallback(() => {
    dispatch({ type: 'RESET' });
    setConfigName('New Configuration');
    setActiveConfigId(null);
  }, []);

  const deleteSavedConfig = useCallback(
    (id: string) => {
      const next = savedConfigs.filter((c) => c.id !== id);
      setSavedConfigs(next);

      if (activeConfigId === id) {
        const replacement = next[0];
        if (replacement) {
          setActiveConfigId(replacement.id);
          setConfigName(replacement.name);
          dispatch({ type: 'SET_CONFIG', payload: replacement.config });
        } else {
          setActiveConfigId(null);
          setConfigName('New Configuration');
          dispatch({ type: 'RESET' });
        }
      }

      if (designatedConfigId === id) {
        setDesignatedConfigId(next[0]?.id ?? null);
      }
    },
    [savedConfigs, activeConfigId, designatedConfigId],
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const stopPolling = useCallback((jobId: string) => {
    const interval = pollingIntervals.current.get(jobId);
    if (interval !== undefined) {
      clearInterval(interval);
      pollingIntervals.current.delete(jobId);
    }
  }, []);

  const pollRunStatus = useCallback(async (jobId: string, runId: string) => {
    try {
      const response = await fetch(`/api/run-eval/${encodeURIComponent(jobId)}`);
      if (!response.ok) return;

      const data = await response.json();
      const status = mapStatusId(data.promptEvalRunStatusId);
      const successes: number = data.successes ?? 0;
      const total: number = data.totalTestCases ?? 0;

      setEvalRuns((prev) =>
        prev.map((run) =>
          run.id === runId
            ? {
                ...run,
                status,
                evalId: data.evalId ?? run.evalId,
                promptfooBaseUrl: data.promptfooBaseUrl ?? run.promptfooBaseUrl,
                passedCount: total > 0 ? successes : run.passedCount,
                totalCount: total > 0 ? total : run.totalCount,
                passRate:
                  total > 0
                    ? Math.round((successes / total) * 1000) / 10
                    : run.passRate,
                errorMessage: data.errorMessage ?? run.errorMessage,
              }
            : run,
        ),
      );

      if (status === 'Complete') {
        stopPolling(jobId);
        setActiveRunJobId(null);
        setIsRunning(false);
        const passRate = total > 0 ? Math.round((successes / total) * 1000) / 10 : 0;
        toast.success(`Evaluation complete: ${successes}/${total} passed (${passRate}%)`);
      } else if (status === 'Error') {
        stopPolling(jobId);
        setActiveRunJobId(null);
        setIsRunning(false);
        toast.error(`Evaluation failed: ${data.errorMessage ?? 'Unknown error'}`);
      }
    } catch {
      // Silently ignore poll errors; they'll retry on the next interval.
    }
  }, [stopPolling]);

  const runEval = useCallback(async () => {
    setIsRunning(true);
    const toastId = toast.loading('Queuing evaluation…');
    try {
      const response = await fetch('/api/run-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to start evaluation');
      }

      const jobId: string = data.jobId;
      const runId = generateId();
      const now = new Date().toISOString();

      const newRun: EvalRun = {
        id: runId,
        configId: activeConfigId ?? '',
        configName: configName,
        passedCount: 0,
        totalCount: 0,
        passRate: 0,
        runAt: now,
        runBy: 'me',
        status: 'InQueue',
        jobId,
        promptfooBaseUrl: data.promptfooBaseUrl,
      };

      setEvalRuns((prev) => [newRun, ...prev]);
      setActiveRunJobId(jobId);

      toast.success('Evaluation queued. It will start shortly.', { id: toastId });

      // Start polling every 15 seconds, matching the Prompt Studio polling interval.
      const interval = setInterval(() => {
        pollRunStatus(jobId, runId);
      }, 15_000);
      pollingIntervals.current.set(jobId, interval);

      // Do an immediate first poll after a short delay so we catch fast completions.
      setTimeout(() => pollRunStatus(jobId, runId), 3_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Evaluation failed: ${message}`, { id: toastId });
      setIsRunning(false);
    }
  }, [config, activeConfigId, configName, pollRunStatus]);

  return (
    <EvalContext.Provider
      value={{
        config,
        yaml,
        configName,
        setConfigName,
        savedConfigs,
        evalRuns,
        activeRunJobId,
        activeConfigId,
        setActiveConfigId,
        designatedConfigId,
        setDesignatedConfigId,
        deleteSavedConfig,
        dispatch,
        setDescription,
        addPrompt,
        updatePrompt,
        deletePrompt,
        setJudgeProvider,
        addAssertion,
        updateAssertion,
        deleteAssertion,
        duplicateAssertion,
        reorderAssertions,
        replaceAllAssertions,
        addTest,
        batchAddTests,
        updateTest,
        deleteTest,
        deleteTestsByIds,
        deleteAllTests,
        replaceAllTests,
        setTestsUrl,
        setRawYaml,
        saveConfig,
        loadConfig,
        createNewConfig,
        reset,
        isRunning,
        runEval,
      }}
    >
      {children}
    </EvalContext.Provider>
  );
}

export function useEval() {
  const context = useContext(EvalContext);
  if (!context) {
    throw new Error('useEval must be used within an EvalProvider');
  }
  return context;
}
