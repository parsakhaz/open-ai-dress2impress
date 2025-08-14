import type { NextRequest } from 'next/server';
import { getServerEnv } from './env';
import { logger } from './logger';
import { ErrorHandler } from './errorHandling';
import { checkRateLimit, type RateLimitType } from './rateLimit';

export function createHandler<TReq, TRes>(opts: {
  parse: (req: NextRequest) => Promise<TReq>;
  handle: (reqBody: TReq, ctx: { env: ReturnType<typeof getServerEnv> }) => Promise<TRes>;
  rateLimit?: RateLimitType | false; // Default to 'standard', set to false to disable
}) {
  return async function handler(req: NextRequest): Promise<Response> {
    const start = performance.now();
    try {
      // Apply rate limiting if enabled (default to 'standard')
      const rateLimitType = opts.rateLimit !== false ? (opts.rateLimit || 'standard') : null;
      if (rateLimitType) {
        await checkRateLimit(req, rateLimitType);
      }
      
      const body = await opts.parse(req);
      const env = getServerEnv();
      const data = await opts.handle(body, { env });
      const duration = performance.now() - start;
      logger.success('API', 'Request completed', { path: req.url, duration });
      return Response.json(data);
    } catch (err) {
      const duration = performance.now() - start;
      const error = err as unknown as Error;
      const isDTI = error && typeof error === 'object' && 'category' in (error as any);
      logger.error('API', 'Request failed', { path: req.url, error: String(error), duration });
      if (isDTI) {
        const e = error as any;
        const status = e.statusCode || 500;
        return Response.json({ error: e.userMessage || e.message || 'Server error', code: e.code }, { status });
      }
      const sys = ErrorHandler.handleSystemError('API', error);
      return Response.json({ error: sys.userMessage, code: sys.code }, { status: sys.statusCode || 500 });
    }
  };
}


