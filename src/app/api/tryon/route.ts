import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { guards } from '@/lib/util/validation';
import { getServerEnv } from '@/lib/util/env';
import { typedFetch } from '@/lib/util/http';
import { parallel, poll, sleep } from '@/lib/util/promise';
import { runWithFashnConcurrency } from '@/lib/util/concurrency';
import { withRetry } from '@/lib/util/errorHandling';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 600;

const BASE_URL = 'https://api.fashn.ai/v1';

async function toBase64DataUrl(input: string): Promise<string> {
  // Already a data URL
  if (input.startsWith('data:')) return input;

  let buffer: Buffer;
  let contentType = 'image/png';

  if (input.startsWith('/')) {
    // Treat as asset under public/. Decode URL-encoded paths (e.g. spaces as %20).
    const publicDir = path.join(process.cwd(), 'public');
    const relRaw = input.replace(/^\//, '');
    const relDecoded = (() => {
      try { return decodeURIComponent(relRaw); } catch { return relRaw; }
    })();
    // Normalize and prevent path traversal
    const absPath = path.normalize(path.join(publicDir, relDecoded));
    if (!absPath.startsWith(publicDir + path.sep) && absPath !== publicDir) {
      throw new Error('Invalid image path');
    }
    buffer = await fs.readFile(absPath);
  } else if (/^https?:\/\//i.test(input)) {
    const res = await fetch(input as string);
    if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.status} ${res.statusText}`);
    const arr = await res.arrayBuffer();
    buffer = Buffer.from(arr);
    const ct = res.headers.get('content-type');
    if (ct && /^image\//.test(ct)) contentType = ct;
  } else {
    // Fallback: try to read as relative path from public (also decode if URL-encoded)
    const publicDir = path.join(process.cwd(), 'public');
    const relDecoded = (() => { try { return decodeURIComponent(input); } catch { return input; } })();
    const absPath = path.normalize(path.join(publicDir, relDecoded));
    if (!absPath.startsWith(publicDir + path.sep) && absPath !== publicDir) {
      throw new Error('Invalid image path');
    }
    buffer = await fs.readFile(absPath);
  }

  // Downscale/compress to keep payloads reasonable
  const optimized = await sharp(buffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  contentType = 'image/webp';

  const b64 = optimized.toString('base64');
  return `data:${contentType};base64,${b64}`;
}

async function runSingleTryOn(characterImageUrl: string, clothingImageUrl: string, apiKey: string): Promise<string> {
  return runWithFashnConcurrency(async () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    } as const;

    // Normalize inputs to data URLs to ensure FASHN can fetch/process
    const [modelDataUrl, garmentDataUrl] = await Promise.all([
      toBase64DataUrl(characterImageUrl),
      toBase64DataUrl(clothingImageUrl),
    ]);

    const runData = await withRetry(
      () =>
        typedFetch<{ id: string }>(
          `${BASE_URL}/run`,
          {
            method: 'POST',
            headers,
            // Use performance mode inside inputs per API guide
            body: JSON.stringify({
              model_name: 'tryon-v1.6',
              inputs: {
                model_image: modelDataUrl,
                garment_image: garmentDataUrl,
                mode: 'performance',
              },
            }),
          },
          { apiName: 'FASHN' }
        ),
      'FASHN /run'
    );

    const result = await poll<{ status: string; output?: string[]; error?: string }>({
      fn: () =>
        withRetry(
          () => typedFetch(`${BASE_URL}/status/${runData.id}`, { headers }, { apiName: 'FASHN' }),
          'FASHN /status'
        ),
      isDone: (r) => r.status === 'completed' && Array.isArray(r.output) && r.output.length > 0,
      intervalMs: 3000,
      timeoutMs: 120_000,
    });

    if (result.status === 'completed' && result.output && result.output[0]) return result.output[0];
    if (result.status === 'failed' || result.status === 'canceled') throw new Error(`FASHN AI failed: ${result.error ?? 'unknown'}`);
    throw new Error('FASHN AI: Prediction timed out after 90 seconds.');
  });
}

export const POST = createHandler<{ characterImageUrl: string; clothingImageUrl: string }, { images: string[] }>({
  parse: async (req: NextRequest) => guards.tryon(await req.json()),
  handle: async ({ characterImageUrl, clothingImageUrl }) => {
    const { FASHN_AI_API_KEY } = getServerEnv();
    const images = await parallel(1, () => runSingleTryOn(characterImageUrl, clothingImageUrl, FASHN_AI_API_KEY));
    return { images };
  },
});

