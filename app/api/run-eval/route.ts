import { NextRequest, NextResponse } from 'next/server';
import type { EvalConfig } from '@/lib/eval-types';
import {
  buildPromptfooConfig,
  prepareEvalConfigForPromptfooRun,
} from '@/lib/promptfoo-eval-config';

export async function POST(req: NextRequest) {
  try {
    const { config }: { config: EvalConfig } = await req.json();

    const base = process.env.PROMPT_MANAGEMENT_API_BASE_URL?.replace(/\/$/, '');
    if (!base) {
      return NextResponse.json(
        { success: false, error: 'PROMPT_MANAGEMENT_API_BASE_URL is not configured on the server.' },
        { status: 503 },
      );
    }

    const prepared = prepareEvalConfigForPromptfooRun(config);
    const promptfooConfig = buildPromptfooConfig(prepared);
    const evalConfigJson = JSON.stringify(promptfooConfig);

    const token = process.env.PROMPT_MANAGEMENT_API_TOKEN;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const evalUrl = `${base}/api/v3/eval-runs`;
    const response = await fetch(evalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ evalConfiguration: evalConfigJson }),
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json(
        { success: false, error: `Eval API returned ${response.status} for ${evalUrl}: ${body}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
