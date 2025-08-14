import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';

export const runtime = 'nodejs';

export const GET = createHandler<void, { flags: Record<string, boolean> }>({
  parse: async () => undefined,
  rateLimit: 'debug', // Very restrictive rate limiting for debug endpoints
  handle: async () => {
    // Dev-only endpoint: surface presence of env vars without values
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Not found');
    }

    const flags = {
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      FASHN_AI_API_KEY: Boolean(process.env.FASHN_AI_API_KEY),
      RAPIDAPI_KEY: Boolean(process.env.RAPIDAPI_KEY),
      RAPIDAPI_HOST: Boolean(process.env.RAPIDAPI_HOST),
      KLING_ACCESS_KEY: Boolean(process.env.KLING_ACCESS_KEY),
      KLING_SECRET_KEY: Boolean(process.env.KLING_SECRET_KEY),
    } as const;

    return { flags };
  },
});


