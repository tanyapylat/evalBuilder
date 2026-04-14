import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await ctx.params;

    const base = process.env.PROMPT_MANAGEMENT_API_BASE_URL?.replace(/\/$/, '');
    if (!base) {
      return NextResponse.json(
        { error: 'PROMPT_MANAGEMENT_API_BASE_URL is not configured.' },
        { status: 503 },
      );
    }

    const token = process.env.PROMPT_MANAGEMENT_API_TOKEN;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(
      `${base}/api/v3/eval-runs/by-job-id/${encodeURIComponent(jobId)}/summary`,
      { headers },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
