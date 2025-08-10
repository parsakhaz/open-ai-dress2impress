import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createHandler } from '@/lib/util/apiRoute';
import { guards } from '@/lib/util/validation';
import { generateKlingToken } from '@/lib/server/kling';
import { poll, sleep } from '@/lib/util/promise';

export const runtime = 'nodejs';
export const maxDuration = 600;

const API_HOST = 'https://api-singapore.klingai.com';

export const POST = createHandler<{ imageUrl: string }, { url: string }>({
  parse: async (req: NextRequest) => guards.video(await req.json()),
  handle: async ({ imageUrl }) => {
    const token = generateKlingToken();
    if (!token) throw new Error('Kling credentials not set');

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
      throw new Error(`Kling create error: ${createResponse.status} ${text}`);
    }
    const created = (await createResponse.json()) as { data: { task_id: string } };
    const taskId = created.data.task_id;

    const result = await poll<{ data: { task_status: string; task_status_msg?: string; task_result?: { videos: { url: string }[] } } }>(
      {
        fn: async () => {
          const pollToken = generateKlingToken();
          if (!pollToken) throw new Error('Kling credentials not set');
          const r = await fetch(`${API_HOST}/v1/videos/image2video/${taskId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${pollToken}` },
          });
          return (await r.json()) as { data: { task_status: string; task_status_msg?: string; task_result?: { videos: { url: string }[] } } };
        },
        isDone: (r) => r.data.task_status === 'succeed' && !!r.data.task_result?.videos?.[0]?.url,
        intervalMs: 5000,
        timeoutMs: 360_000,
      }
    );

    if (result.data.task_status === 'succeed' && result.data.task_result?.videos?.[0]?.url) {
      return { url: result.data.task_result.videos[0].url };
    }
    if (result.data.task_status === 'failed') {
      throw new Error(`Kling failed: ${result.data.task_status_msg ?? 'unknown'}`);
    }
    throw new Error('Kling timed out');
  },
});

