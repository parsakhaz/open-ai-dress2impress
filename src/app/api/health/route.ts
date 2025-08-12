import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest): Promise<Response> {
  return Response.json({ ok: true, ts: Date.now() });
}


