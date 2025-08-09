import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 600;

const ACCESS_KEY = process.env.KLING_ACCESS_KEY || process.env.NEXT_PUBLIC_KLING_ACCESS_KEY;
const SECRET_KEY = process.env.KLING_SECRET_KEY || process.env.NEXT_PUBLIC_KLING_SECRET_KEY;
const API_HOST = 'https://api-singapore.klingai.com';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

function generateKlingToken() {
  if (!ACCESS_KEY || !SECRET_KEY) return null;
  const payload = {
    iss: ACCESS_KEY,
    exp: Math.floor(Date.now() / 1000) + 1800,
    nbf: Math.floor(Date.now() / 1000) - 5,
  };
  return jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = (await req.json()) as { imageUrl: string };
    if (!imageUrl) return new Response('Missing imageUrl', { status: 400 });
    const token = generateKlingToken();
    if (!token) return new Response('Kling credentials not set', { status: 500 });

    const external_task_id = uuidv4();
    const createResponse = await fetch(`${API_HOST}/v1/videos/image2video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model_name: 'kling-v1-6',
        mode: 'std',
        duration: '5',
        image: imageUrl,
        prompt: 'A fashion model walks forward on a runway, studio lighting, plain white background.',
        external_task_id,
      }),
    });
    if (!createResponse.ok) {
      const text = await createResponse.text();
      return new Response(`Kling create error: ${createResponse.status} ${text}`, { status: 500 });
    }
    const created = (await createResponse.json()) as { data: { task_id: string } };
    const taskId = created.data.task_id;

    for (let i = 0; i < 120; i++) {
      await sleep(5000);
      const pollToken = generateKlingToken();
      if (!pollToken) continue;
      const queryResponse = await fetch(`${API_HOST}/v1/videos/image2video/${taskId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${pollToken}` },
      });
      const queryResult = (await queryResponse.json()) as {
        data: { task_status: 'succeed' | 'failed' | string; task_status_msg?: string; task_result?: { videos: { url: string }[] } };
      };
      if (queryResult.data.task_status === 'succeed' && queryResult.data.task_result?.videos?.[0]?.url) {
        return Response.json({ url: queryResult.data.task_result.videos[0].url });
      }
      if (queryResult.data.task_status === 'failed') {
        return new Response(`Kling failed: ${queryResult.data.task_status_msg ?? 'unknown'}`, { status: 500 });
      }
    }

    return new Response('Kling timed out', { status: 504 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}


