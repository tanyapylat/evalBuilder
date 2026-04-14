import type { EvalConfig, ProviderConfig } from '@/lib/eval-types';

function applyProviderEnv(
  provider: ProviderConfig,
  opts: { baseUrl?: string; token?: string },
): ProviderConfig {
  const { baseUrl, token } = opts;
  let url = provider.config.url;
  if (baseUrl) {
    url = url.replace(/\{\{promptManagementApiBaseUrl\}\}/g, baseUrl);
  }
  const body = baseUrl
    ? Object.fromEntries(
        Object.entries(provider.config.body).map(([k, v]) => [
          k,
          v.replace(/\{\{promptManagementApiBaseUrl\}\}/g, baseUrl),
        ]),
      )
    : { ...provider.config.body };

  const headers = { ...provider.config.headers };
  if (
    token &&
    !headers.Authorization &&
    !headers.authorization &&
    url.includes('eval-runs/execute-prompt')
  ) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    ...provider,
    config: {
      ...provider.config,
      url,
      body,
      headers,
    },
  };
}

/**
 * Apply server env to eval config before calling promptfoo's `evaluate`:
 * - Replace `{{promptManagementApiBaseUrl}}` using `PROMPT_MANAGEMENT_API_BASE_URL`
 * - Add `Authorization: Bearer …` from `PROMPT_MANAGEMENT_API_TOKEN` for execute-prompt URLs when missing
 */
export function prepareEvalConfigForPromptfooRun(config: EvalConfig): EvalConfig {
  const needsBase = JSON.stringify(config).includes('{{promptManagementApiBaseUrl}}');
  const base = process.env.PROMPT_MANAGEMENT_API_BASE_URL?.replace(/\/$/, '');
  const token = process.env.PROMPT_MANAGEMENT_API_TOKEN;

  if (needsBase && !base) {
    throw new Error(
      'Eval config uses {{promptManagementApiBaseUrl}} but PROMPT_MANAGEMENT_API_BASE_URL is not set on the server.',
    );
  }

  if (!config.providers?.length) {
    return config;
  }

  return {
    ...config,
    providers: config.providers.map((p) => applyProviderEnv(p, { baseUrl: base, token })),
  };
}

/** Map our `EvalConfig` to the object shape expected by promptfoo's programmatic `evaluate`. */
export function buildPromptfooConfig(config: EvalConfig) {
  return {
    description: config.description,

    prompts: config.prompts.map((p) =>
      JSON.stringify({
        promptId: p.promptId,
        versionId: p.versionId,
        ...(p.label ? { label: p.label } : {}),
      }),
    ),

    providers: (config.providers ?? []).map((provider) => ({
      id: provider.id,
      config: {
        url: provider.config.url,
        method: provider.config.method,
        headers: provider.config.headers,
        ...(provider.config.transformResponse
          ? { transformResponse: provider.config.transformResponse }
          : {}),
        body: provider.config.body,
      },
    })),

    defaultTest: {
      ...(config.defaultTest.options?.provider
        ? {
            options: {
              provider: {
                id: config.defaultTest.options.provider.id,
                config: config.defaultTest.options.provider.config,
              },
            },
          }
        : {}),
      assert: config.defaultTest.assert.map(({ type, metric, value, threshold }) => ({
        type,
        ...(metric ? { metric } : {}),
        ...(value !== undefined && value !== '' ? { value } : {}),
        ...(threshold !== undefined ? { threshold } : {}),
      })),
    },

    tests: Array.isArray(config.tests)
      ? config.tests.map((t) => ({
          ...(t.description ? { description: t.description } : {}),
          vars: t.vars,
          ...(t.assert && t.assert.length > 0
            ? {
                assert: t.assert.map(({ type, metric, value }) => ({
                  type,
                  ...(metric ? { metric } : {}),
                  ...(value !== undefined && value !== '' ? { value } : {}),
                })),
              }
            : {}),
        }))
      : config.tests,
  };
}
