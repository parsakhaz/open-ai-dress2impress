// src/app/api/ai-player/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { AIPlayerAgent } from '@/lib/ai-player/agent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Accept overrides from client; default to current behavior
  let body: any = undefined;
  try {
    body = await req.json();
  } catch {}
  const theme = typeof body?.theme === 'string' && body.theme.trim() ? body.theme : 'Summer Rooftop Party';
  // Fallback to an existing public asset to avoid ENOENT when no avatar is provided
  const avatarUrl = typeof body?.avatarUrl === 'string' && body.avatarUrl.trim() ? body.avatarUrl : '/character/image.webp';
  const durationMs = typeof body?.durationMs === 'number' && Number.isFinite(body.durationMs) ? body.durationMs : 120000;

  try {
    const stream = new TransformStream<Uint8Array>();
    const { writable, readable } = stream;

    // Start GPT-driven AI player run without awaiting completion
    const runId = Math.random().toString(36).slice(2, 10);
    const player = new AIPlayerAgent({ runId, writer: writable.getWriter(), theme, avatarUrl, durationMs });
    void player.run();

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Failed to start AI player stream:', error);
    return NextResponse.json({ error: 'Failed to initialize AI player.' }, { status: 500 });
  }
}


