export type PromptMessageRole = 'system' | 'user' | 'assistant';

export interface PromptMessage {
  role: PromptMessageRole;
  content: string;
}

/** Serializable prompt version payload for Editor / Code modes (Prompt Studio shape). */
export interface PromptVersionContent {
  messages: PromptMessage[];
  /** Mustache variable names (without braces). */
  variables: string[];
  vendor: string;
  model: string;
  params: {
    temperature: number;
    max_tokens: number;
  };
}

export function defaultPromptVersionContent(): PromptVersionContent {
  return {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: '{{user_message}}' },
    ],
    variables: ['user_message'],
    vendor: 'openai',
    model: 'gpt-4.1-2025-04-14',
    params: { temperature: 0, max_tokens: 3000 },
  };
}

export function clonePromptVersionContent(c: PromptVersionContent): PromptVersionContent {
  return JSON.parse(JSON.stringify(c)) as PromptVersionContent;
}
