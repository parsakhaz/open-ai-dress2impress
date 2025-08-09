import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 600;

const API_KEY = process.env.FASHN_AI_API_KEY;
const BASE_URL = 'https://api.fashn.ai/v1';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function runSingleTryOn(characterImageUrl: string, clothingImageUrl: string): Promise<string> {
  if (!API_KEY) throw new Error('FASHN_AI_API_KEY not set');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  } as const;

  const runResponse = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model_name: 'tryon-v1.6',
      inputs: { model_image: characterImageUrl, garment_image: clothingImageUrl },
    }),
  });
  if (!runResponse.ok) throw new Error('FASHN AI: Failed to start prediction job.');
  const runData = (await runResponse.json()) as { id: string };
  const predictionId = runData.id;

  for (let i = 0; i < 30; i++) {
    const statusResponse = await fetch(`${BASE_URL}/status/${predictionId}`, { headers });
    const statusData = (await statusResponse.json()) as {
      status: 'completed' | 'failed' | 'canceled' | string;
      output?: string[];
      error?: string;
    };
    if (statusData.status === 'completed' && statusData.output && statusData.output.length > 0) {
      return statusData.output[0];
    } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
      throw new Error(`FASHN AI: Prediction failed or was canceled. Reason: ${statusData.error ?? 'unknown'}`);
    }
    await sleep(3000);
  }

  throw new Error('FASHN AI: Prediction timed out after 90 seconds.');
}

export async function POST(req: NextRequest) {
  try {
    const { characterImageUrl, clothingImageUrl } = (await req.json()) as {
      characterImageUrl: string;
      clothingImageUrl: string;
    };
    if (!characterImageUrl || !clothingImageUrl) return new Response('Missing params', { status: 400 });
    const calls = [
      runSingleTryOn(characterImageUrl, clothingImageUrl),
      runSingleTryOn(characterImageUrl, clothingImageUrl),
      runSingleTryOn(characterImageUrl, clothingImageUrl),
      runSingleTryOn(characterImageUrl, clothingImageUrl),
    ];
    const images = await Promise.all(calls);
    return Response.json({ images });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}


