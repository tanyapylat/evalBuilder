import type { EvalConfig } from './eval-types';

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
    lines.push(`description: ${config.description}`);
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
      lines.push(`  - '${JSON.stringify(promptObj)}'`);
    }
  }

  // Providers
  if (config.providers && config.providers.length > 0) {
    lines.push('providers:');
    for (const provider of config.providers) {
      lines.push(`  - id: ${provider.id}`);
      lines.push('    config:');
      lines.push(`      url: '${provider.config.url}'`);
      lines.push(`      method: ${provider.config.method}`);
      if (provider.config.headers && Object.keys(provider.config.headers).length > 0) {
        lines.push('      headers:');
        for (const [key, value] of Object.entries(provider.config.headers)) {
          lines.push(`        ${key}: ${value}`);
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
            lines.push(`        ${parts[0]}:`);
            lines.push(`          ${parts[1]}: '${value}'`);
          } else {
            lines.push(`        ${key}: '${value}'`);
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
      lines.push(`      id: ${provider.id}`);
      lines.push('      config:');
      lines.push(`        max_tokens: ${provider.config.max_tokens}`);
      lines.push(`        temperature: ${provider.config.temperature}`);
      if (provider.config.headers && Object.keys(provider.config.headers).length > 0) {
        lines.push('        headers:');
        for (const [key, value] of Object.entries(provider.config.headers)) {
          lines.push(`          ${key}: ${value}`);
        }
      }
    }
    
    // Assertions
    if (config.defaultTest.assert.length > 0) {
      lines.push('  assert:');
      for (const assertion of config.defaultTest.assert) {
        if (assertion.metric) {
          lines.push(`    - metric: ${assertion.metric}`);
          lines.push(`      type: ${assertion.type}`);
        } else {
          lines.push(`    - type: ${assertion.type}`);
        }
        if (Array.isArray(assertion.value)) {
          lines.push('      value:');
          for (const v of assertion.value) {
            lines.push(`        - ${v}`);
          }
        } else if (typeof assertion.value === 'string' && assertion.value.includes('\n')) {
          lines.push('      value: >-');
          // Word wrap long lines for readability
          const words = assertion.value.replace(/\n/g, ' ').split(' ');
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
        } else if (assertion.value !== undefined && assertion.value !== '') {
          lines.push(`      value: ${assertion.value}`);
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
      lines.push(`  - '${config.tests}'`);
    } else if (Array.isArray(config.tests) && config.tests.length > 0) {
      lines.push('tests:');
      for (const test of config.tests) {
        if (test.description) {
          lines.push(`  - description: ${test.description}`);
          lines.push('    vars:');
        } else {
          lines.push('  - vars:');
        }
        for (const [key, value] of Object.entries(test.vars)) {
          if (value.length > 80 || value.includes('\n')) {
            lines.push(`      ${key}: >`);
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
            lines.push(`      ${key}: ${value}`);
          }
        }
        if (test.assert && test.assert.length > 0) {
          lines.push('    assert:');
          for (const assertion of test.assert) {
            lines.push(`      - type: ${assertion.type}`);
            if (assertion.metric) {
              lines.push(`        metric: ${assertion.metric}`);
            }
            if (assertion.value !== undefined && assertion.value !== '') {
              if (Array.isArray(assertion.value)) {
                lines.push('        value:');
                for (const v of assertion.value) {
                  lines.push(`          - ${v}`);
                }
              } else {
                lines.push(`        value: ${assertion.value}`);
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
