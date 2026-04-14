import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_API_PREFIX = '/api/v3';

async function proxy(req: NextRequest, segments: string[], method: 'GET' | 'POST') {
  const base = process.env.PROMPT_MANAGEMENT_API_BASE_URL?.replace(/\/$/, '');
  if (!base) {
    return NextResponse.json(
      { error: 'PROMPT_MANAGEMENT_API_BASE_URL is not configured on the server.' },
      { status: 503 },
    );
  }

  const path = segments.join('/');
  const url = new URL(`${base}${UPSTREAM_API_PREFIX}/${path}`);
  if (req.nextUrl.search) {
    url.search = req.nextUrl.search;
  }

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const token = process.env.PROMPT_MANAGEMENT_API_TOKEN;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const init: RequestInit = { method, headers };
  if (method === 'POST') {
    init.body = await req.text();
  }

  const upstream = await fetch(url, init);
  const body = await upstream.text();
  const out = new NextResponse(body, { status: upstream.status });
  const ct = upstream.headers.get('content-type');
  if (ct) out.headers.set('Content-Type', ct);
  return out;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ segments?: string[] }> },
) {
  const { segments = [] } = await ctx.params;
  return proxy(req, segments, 'GET');
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ segments?: string[] }> },
) {
  const { segments = [] } = await ctx.params;
  return proxy(req, segments, 'POST');
}
