import type { NextRequest } from 'next/server';
import { getServerEnv } from './env';
import { logger } from './logger';
import { ErrorHandler } from './errorHandling';

export function createHandler<TReq, TRes>(opts: {
  parse: (req: NextRequest) => Promise<TReq>;
  handle: (reqBody: TReq, ctx: { env: ReturnType<typeof getServerEnv> }) => Promise<TRes>;
}) {
  return async function handler(req: NextRequest): Promise<Response> {
    const start = performance.now();
    try {
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
        return new Response(e.userMessage || e.message || 'Server error', { status });
      }
      const sys = ErrorHandler.handleSystemError('API', error);
      return new Response(sys.userMessage, { status: sys.statusCode || 500 });
    }
  };
}


