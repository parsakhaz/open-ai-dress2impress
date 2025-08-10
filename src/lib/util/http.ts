import { createAPIError, ErrorHandler } from './errorHandling';
import { logger } from './logger';

export async function typedFetch<T>(
  url: string,
  init?: RequestInit,
  options?: { apiName?: string; asTextOnError?: boolean }
): Promise<T> {
  const { apiName = 'HTTP', asTextOnError = true } = options || {};
  logger.api(init?.method || 'GET', url, 'START');
  let res: Response | null = null;
  try {
    res = await fetch(url, init);
    if (!res.ok) {
      const text = asTextOnError ? await res.text() : '';
      throw ErrorHandler.handleAPIError(apiName, url, res, new Error(text || res.statusText));
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return (await res.json()) as T;
    }
    // Fallback to text and attempt JSON parse
    const txt = await res.text();
    try {
      return JSON.parse(txt) as T;
    } catch {
      return (txt as unknown) as T;
    }
  } catch (error) {
    logger.api(init?.method || 'GET', url, 'ERROR', { error: String(error) });
    if (error && typeof error === 'object' && 'category' in (error as any)) {
      throw error;
    }
    throw createAPIError(apiName, url, res, error as Error);
  } finally {
    if (res?.ok) logger.api(init?.method || 'GET', url, 'SUCCESS');
  }
}

export async function postJson<TReq, TRes>(
  url: string,
  body: TReq,
  init?: RequestInit,
  options?: { apiName?: string }
): Promise<TRes> {
  return typedFetch<TRes>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: JSON.stringify(body),
      ...init,
    },
    { apiName: options?.apiName || 'HTTP' }
  );
}

export async function fetchBlob(input: string): Promise<Blob> {
  if (input.startsWith('data:')) {
    const match = input.match(/^data:(.*?);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URL');
    const mime = match[1];
    const b64 = match[2];
    const buffer = Buffer.from(b64, 'base64');
    return new Blob([buffer], { type: mime });
  }
  const res = await fetch(input);
  if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status}`);
  const ab = await res.arrayBuffer();
  return new Blob([ab], { type: res.headers.get('content-type') || 'application/octet-stream' });
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Operation timed out'): Promise<T> {
  let timer: any;
  const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(message)), ms)));
  try {
    const result = await Promise.race([promise, timeout]);
    return result as T;
  } finally {
    clearTimeout(timer);
  }
}


