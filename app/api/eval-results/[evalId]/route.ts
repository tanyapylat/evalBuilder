import { NextRequest, NextResponse } from 'next/server';
import { MOCK_EVAL_RESULTS } from '@/lib/mock-eval-results';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ evalId: string }> },
) {
  const { evalId } = await params;

  const data = MOCK_EVAL_RESULTS[evalId];
  if (!data) {
    return NextResponse.json(
      { error: `Eval run '${evalId}' not found` },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
