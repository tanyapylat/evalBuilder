import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type {
  Assertion,
  AssertionType,
  EvalConfig,
  JudgeProviderConfig,
  PromptConfig,
  ProviderConfig,
  TestCase,
} from './eval-types';

/** Encode a string as a YAML scalar (quotes when needed) so values with `:` do not break parsing. */
function yamlScalar(s: string): string {
  return stringifyYaml(s).trimEnd();
}

// Simple ID generator without uuid dependency
let idCounter = 0;
export function generateId(): string {
  return `id_${Date.now()}_${++idCounter}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to properly indent multiline strings
function indentMultiline(str: string, indent: string): string {
  return str.split('\n').map(line => indent + line).join('\n');
}

// Generate YAML from config (simple serialization)
export function configToYaml(config: EvalConfig): string {
  const lines: string[] = [];
  
  // Description
  if (config.description) {
    lines.push(`description: ${yamlScalar(config.description)}`);
  }
  
  // Prompts
  if (config.prompts.length > 0) {
    lines.push('prompts:');
    for (const prompt of config.prompts) {
      const promptObj: Record<string, unknown> = {
        promptId: prompt.promptId,
        versionId: prompt.versionId,
      };
      if (prompt.label) {
        promptObj.label = prompt.label;
      }
      lines.push(`  - ${yamlScalar(JSON.stringify(promptObj))}`);
    }
  }

  // Providers
  if (config.providers && config.providers.length > 0) {
    lines.push('providers:');
    for (const provider of config.providers) {
      lines.push(`  - id: ${yamlScalar(String(provider.id))}`);
      lines.push('    config:');
      lines.push(`      url: ${yamlScalar(provider.config.url)}`);
      lines.push(`      method: ${yamlScalar(provider.config.method)}`);
      if (provider.config.headers && Object.keys(provider.config.headers).length > 0) {
        lines.push('      headers:');
        for (const [key, value] of Object.entries(provider.config.headers)) {
          lines.push(`        ${yamlScalar(key)}: ${yamlScalar(value)}`);
        }
      }
      if (provider.config.transformResponse) {
        lines.push('      transformResponse: |-');
        lines.push(indentMultiline(provider.config.transformResponse, '        '));
      }
      if (provider.config.body && Object.keys(provider.config.body).length > 0) {
        lines.push('      body:');
        for (const [key, value] of Object.entries(provider.config.body)) {
          if (key.includes('.')) {
            // Handle nested keys like "variables.user_message"
            const parts = key.split('.');
            lines.push(`        ${yamlScalar(parts[0]!)}:`);
            lines.push(`          ${yamlScalar(parts[1]!)}: ${yamlScalar(value)}`);
          } else {
            lines.push(`        ${yamlScalar(key)}: ${yamlScalar(value)}`);
          }
        }
      }
    }
  }
  
  // Default test with assertions
  if (config.defaultTest.assert.length > 0 || config.defaultTest.options?.provider) {
    lines.push('defaultTest:');
    
    // Judge provider options
    if (config.defaultTest.options?.provider) {
      const provider = config.defaultTest.options.provider;
      lines.push('  options:');
      lines.push('    provider:');
      lines.push(`      id: ${yamlScalar(String(provider.id))}`);
      lines.push('      config:');
      lines.push(`        max_tokens: ${provider.config.max_tokens}`);
      lines.push(`        temperature: ${provider.config.temperature}`);
      if (provider.config.headers && Object.keys(provider.config.headers).length > 0) {
        lines.push('        headers:');
        for (const [key, value] of Object.entries(provider.config.headers)) {
          lines.push(`          ${yamlScalar(key)}: ${yamlScalar(value)}`);
        }
      }
    }
    
    // Assertions
    if (config.defaultTest.assert.length > 0) {
      lines.push('  assert:');
      for (const assertion of config.defaultTest.assert) {
        if (assertion.metric) {
          lines.push(`    - metric: ${yamlScalar(assertion.metric)}`);
          lines.push(`      type: ${yamlScalar(assertion.type)}`);
        } else {
          lines.push(`    - type: ${yamlScalar(assertion.type)}`);
        }
        if (Array.isArray(assertion.value)) {
          lines.push('      value:');
          for (const v of assertion.value) {
            lines.push(`        - ${yamlScalar(String(v))}`);
          }
        } else if (typeof assertion.value === 'string' && assertion.value.includes('\n')) {
          lines.push('      value: |');
          lines.push(indentMultiline(assertion.value, '        '));
        } else if (assertion.value !== undefined && assertion.value !== '') {
          lines.push(`      value: ${yamlScalar(String(assertion.value))}`);
        }
        if (assertion.threshold !== undefined) {
          lines.push(`      threshold: ${assertion.threshold}`);
        }
      }
    }
  }
  
  // Tests
  if (config.tests) {
    if (typeof config.tests === 'string') {
      lines.push('tests:');
      lines.push(`  - ${yamlScalar(config.tests)}`);
    } else if (Array.isArray(config.tests) && config.tests.length > 0) {
      lines.push('tests:');
      for (const test of config.tests) {
        if (test.description) {
          lines.push(`  - description: ${yamlScalar(test.description)}`);
          lines.push('    vars:');
        } else {
          lines.push('  - vars:');
        }
        for (const [key, value] of Object.entries(test.vars)) {
          if (value.length > 80 || value.includes('\n')) {
            lines.push(`      ${yamlScalar(key)}: >`);
            // Word wrap long content
            const words = value.replace(/\n/g, ' ').split(' ');
            let currentLine = '        ';
            for (const word of words) {
              if (currentLine.length + word.length > 80) {
                lines.push(currentLine.trimEnd());
                currentLine = '        ' + word + ' ';
              } else {
                currentLine += word + ' ';
              }
            }
            if (currentLine.trim()) {
              lines.push(currentLine.trimEnd());
            }
          } else {
            lines.push(`      ${yamlScalar(key)}: ${yamlScalar(value)}`);
          }
        }
        if (test.assert && test.assert.length > 0) {
          lines.push('    assert:');
          for (const assertion of test.assert) {
            lines.push(`      - type: ${yamlScalar(assertion.type)}`);
            if (assertion.metric) {
              lines.push(`        metric: ${yamlScalar(assertion.metric)}`);
            }
            if (assertion.value !== undefined && assertion.value !== '') {
              if (Array.isArray(assertion.value)) {
                lines.push('        value:');
                for (const v of assertion.value) {
                  lines.push(`          - ${yamlScalar(String(v))}`);
                }
              } else {
                lines.push(`        value: ${yamlScalar(String(assertion.value))}`);
              }
            }
          }
        }
      }
    }
  }
  
  return lines.join('\n');
}

// Validate YAML structure
export function validateYaml(yamlString: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!yamlString.trim()) {
    errors.push('YAML content is empty');
    return { valid: false, errors };
  }
  
  // Check for basic YAML structure issues
  const lines = yamlString.split('\n');
  let hasDescription = false;
  let hasPrompts = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('description:')) hasDescription = true;
    if (trimmed.startsWith('prompts:')) hasPrompts = true;
    
    // Check for tab characters (YAML should use spaces)
    if (line.includes('\t')) {
      errors.push('YAML should use spaces for indentation, not tabs');
    }
  }
  
  if (!hasDescription) {
    errors.push('Missing "description" field');
  }
  
  if (!hasPrompts) {
    errors.push('Missing "prompts" field');
  }
  
  return { valid: errors.length === 0, errors };
}

function flattenProviderBody(body: unknown): Record<string, string> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const out: Record<string, string> = {};
  const walk = (prefix: string, o: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(o)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        walk(key, v as Record<string, unknown>);
      } else {
        out[key] = String(v ?? '');
      }
    }
  };
  walk('', body as Record<string, unknown>);
  return out;
}

function parsePromptEntry(raw: unknown, index: number): PromptConfig {
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      return {
        promptId: (j.promptId ?? j.prompt_id) as number | string,
        versionId: (j.versionId ?? j.version_id) as number | string,
        label: j.label !== undefined ? String(j.label) : undefined,
      };
    } catch {
      throw new Error(`prompts[${index}]: expected a JSON object string`);
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      promptId: (o.promptId ?? o.prompt_id) as number | string,
      versionId: (o.versionId ?? o.version_id) as number | string,
      label: o.label !== undefined ? String(o.label) : undefined,
    };
  }
  throw new Error(`prompts[${index}]: expected an object or JSON string`);
}

function parseAssertionBlock(raw: unknown, index: number): Assertion {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`assert[${index}]: expected an object`);
  }
  const o = raw as Record<string, unknown>;
  const type = o.type as AssertionType | undefined;
  if (!type || typeof type !== 'string') {
    throw new Error(`assert[${index}]: missing type`);
  }
  return {
    id: generateId(),
    type: type as AssertionType,
    metric: o.metric !== undefined ? String(o.metric) : undefined,
    value: (o.value !== undefined ? o.value : '') as Assertion['value'],
    threshold: typeof o.threshold === 'number' ? o.threshold : undefined,
  };
}

function parseJudgeProvider(raw: unknown): JudgeProviderConfig | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const cfg = o.config;
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return undefined;
  const c = cfg as Record<string, unknown>;
  return {
    id: String(o.id ?? ''),
    config: {
      max_tokens: Number(c.max_tokens ?? 0),
      temperature: Number(c.temperature ?? 0),
      headers:
        c.headers && typeof c.headers === 'object' && !Array.isArray(c.headers)
          ? (c.headers as Record<string, string>)
          : {},
    },
  };
}

/** Parse eval config YAML (round-trips with {@link configToYaml} and accepts typical promptfoo-style shapes). */
export function parseEvalConfigYaml(yamlString: string): EvalConfig {
  if (!yamlString.trim()) {
    throw new Error('YAML content is empty');
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlString);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`YAML parse error: ${message}`);
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Root YAML value must be a mapping');
  }

  const obj = parsed as Record<string, unknown>;
  const known = new Set([
    'description',
    'prompts',
    'providers',
    'defaultTest',
    'tests',
  ]);
  const unsupportedSections: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) {
      unsupportedSections[key] = obj[key];
    }
  }

  const description =
    obj.description !== undefined && obj.description !== null
      ? String(obj.description)
      : '';

  const promptsRaw = obj.prompts;
  const prompts: PromptConfig[] = Array.isArray(promptsRaw)
    ? promptsRaw.map((p, i) => parsePromptEntry(p, i))
    : [];

  let providers: ProviderConfig[] | undefined;
  if (Array.isArray(obj.providers) && obj.providers.length > 0) {
    providers = obj.providers.map((p, i) => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        throw new Error(`providers[${i}]: expected an object`);
      }
      const o = p as Record<string, unknown>;
      const cfg = o.config;
      if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
        throw new Error(`providers[${i}]: missing config`);
      }
      const c = cfg as Record<string, unknown>;
      return {
        id: String(o.id ?? ''),
        config: {
          url: String(c.url ?? ''),
          method: String(c.method ?? 'POST'),
          headers:
            c.headers && typeof c.headers === 'object' && !Array.isArray(c.headers)
              ? (c.headers as Record<string, string>)
              : {},
          transformResponse:
            c.transformResponse !== undefined && c.transformResponse !== null
              ? String(c.transformResponse)
              : undefined,
          body: flattenProviderBody(c.body),
        },
      };
    });
  }

  const defaultTestRaw = obj.defaultTest;
  let defaultTest: EvalConfig['defaultTest'] = { assert: [] };
  if (defaultTestRaw !== undefined && defaultTestRaw !== null) {
    if (typeof defaultTestRaw !== 'object' || Array.isArray(defaultTestRaw)) {
      throw new Error('defaultTest must be a mapping');
    }
    const dt = defaultTestRaw as Record<string, unknown>;
    const assertRaw = dt.assert;
    const assertList = Array.isArray(assertRaw) ? assertRaw : [];
    const assert = assertList.map((a, i) => parseAssertionBlock(a, i));

    let options: EvalConfig['defaultTest']['options'];
    const optRaw = dt.options;
    if (optRaw && typeof optRaw === 'object' && !Array.isArray(optRaw)) {
      const prov = (optRaw as Record<string, unknown>).provider;
      const jp = parseJudgeProvider(prov);
      if (jp) {
        options = { provider: jp };
      }
    }

    defaultTest = { assert, ...(options ? { options } : {}) };
  }

  let tests: TestCase[] | string = [];
  const testsRaw = obj.tests;
  if (typeof testsRaw === 'string') {
    tests = testsRaw;
  } else if (Array.isArray(testsRaw)) {
    tests = testsRaw.map((t, i) => {
      if (!t || typeof t !== 'object' || Array.isArray(t)) {
        throw new Error(`tests[${i}]: expected an object`);
      }
      const row = t as Record<string, unknown>;
      const varsRaw = row.vars;
      const vars: Record<string, string> =
        varsRaw && typeof varsRaw === 'object' && !Array.isArray(varsRaw)
          ? Object.fromEntries(
              Object.entries(varsRaw as Record<string, unknown>).map(([k, v]) => [
                k,
                String(v ?? ''),
              ]),
            )
          : {};
      const assertRaw = row.assert;
      const assert = Array.isArray(assertRaw)
        ? assertRaw.map((a, j) => parseAssertionBlock(a, j))
        : undefined;
      return {
        id: generateId(),
        description:
          row.description !== undefined && row.description !== null
            ? String(row.description)
            : undefined,
        vars,
        assert,
      };
    });
  }

  const result: EvalConfig = {
    description,
    prompts,
    ...(providers !== undefined ? { providers } : {}),
    defaultTest,
    tests,
    ...(Object.keys(unsupportedSections).length > 0
      ? { unsupportedSections }
      : {}),
    rawYaml: yamlString,
  };

  return result;
}
