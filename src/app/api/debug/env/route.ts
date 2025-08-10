import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  // Dev-only endpoint: surface presence of env vars without values
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 });
  }

  const flags = {
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    FASHN_AI_API_KEY: Boolean(process.env.FASHN_AI_API_KEY),
    RAPIDAPI_KEY: Boolean(process.env.RAPIDAPI_KEY),
    RAPIDAPI_HOST: Boolean(process.env.RAPIDAPI_HOST),
    KLING_ACCESS_KEY: Boolean(process.env.KLING_ACCESS_KEY),
    KLING_SECRET_KEY: Boolean(process.env.KLING_SECRET_KEY),
  } as const;

  return Response.json({ flags });
}


