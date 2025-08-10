import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { guards } from '@/lib/util/validation';
import { getServerEnv } from '@/lib/util/env';
import { typedFetch } from '@/lib/util/http';
import { parallel, poll, sleep } from '@/lib/util/promise';

export const runtime = 'nodejs';
export const maxDuration = 600;

const BASE_URL = 'https://api.fashn.ai/v1';

async function runSingleTryOn(characterImageUrl: string, clothingImageUrl: string, apiKey: string): Promise<string> {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  } as const;

  const runData = await typedFetch<{ id: string }>(
    `${BASE_URL}/run`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ model_name: 'tryon-v1.6', inputs: { model_image: characterImageUrl, garment_image: clothingImageUrl } }),
    },
    { apiName: 'FASHN' }
  );

  const result = await poll<{ status: string; output?: string[]; error?: string }>({
    fn: () => typedFetch(`${BASE_URL}/status/${runData.id}`, { headers }, { apiName: 'FASHN' }),
    isDone: (r) => r.status === 'completed' && Array.isArray(r.output) && r.output.length > 0,
    intervalMs: 3000,
    timeoutMs: 90_000,
  });

  if (result.status === 'completed' && result.output && result.output[0]) return result.output[0];
  if (result.status === 'failed' || result.status === 'canceled') throw new Error(`FASHN AI failed: ${result.error ?? 'unknown'}`);
  throw new Error('FASHN AI: Prediction timed out after 90 seconds.');
}

export const POST = createHandler<{ characterImageUrl: string; clothingImageUrl: string }, { images: string[] }>({
  parse: async (req: NextRequest) => guards.tryon(await req.json()),
  handle: async ({ characterImageUrl, clothingImageUrl }) => {
    const { FASHN_AI_API_KEY } = getServerEnv();
    const images = await parallel(4, () => runSingleTryOn(characterImageUrl, clothingImageUrl, FASHN_AI_API_KEY));
    return { images };
  },
});

