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
  parse: async (req: NextRequest) => {
    // Be resilient to empty or non-JSON bodies to avoid SyntaxError
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Swallow JSON parse error; guards will throw a validation error below
    }
    return guards.video(body);
  },
  handle: async ({ imageUrl }) => {
    const token = generateKlingToken();
    if (!token) throw new Error('Kling credentials not set');

    const external_task_id = uuidv4();
    const createResponse = await fetch(`${API_HOST}/v1/videos/image2video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: JSON.stringify({
        model_name: 'kling-v1-6',
        mode: 'std',
        duration: 5,
        // Request 720p output when supported
        resolution: '720p',
        width: 1280,
        height: 720,
        image: imageUrl,
        prompt:
          'Full-body wide shot of a fashion model walking straight toward the camera on a runway from a distance quickly; zoomed out; the entire figure (head to toe) visible and centered; professional studio lighting; clean white seamless background; steady camera.',
        external_task_id,
      }),
      keepalive: true,
    });
    if (!createResponse.ok) {
      const text = await createResponse.text();
      throw new Error(`Kling create error: ${createResponse.status} ${text}`);
    }
    const created = (await createResponse.json()) as { data: { task_id: string } };
    const taskId = created.data.task_id;

    const result = await poll<{ data: { task_status: string; task_status_msg?: string; task_result?: { videos?: { url: string }[]; video_url?: string } } }>(
      {
        fn: async () => {
          const pollToken = generateKlingToken();
          if (!pollToken) throw new Error('Kling credentials not set');
          const r = await fetch(`${API_HOST}/v1/videos/image2video/${taskId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${pollToken}`, Accept: 'application/json' },
          });
          return (await r.json()) as { data: { task_status: string; task_status_msg?: string; task_result?: { videos?: { url: string }[]; video_url?: string } } };
        },
        isDone: (r) => {
          const status = (r.data.task_status || '').toLowerCase();
          const ok = ['succeed', 'succeeded', 'success', 'done', 'completed'].includes(status);
          const url = r.data.task_result?.videos?.[0]?.url || r.data.task_result?.video_url;
          return ok && !!url;
        },
        intervalMs: 5000,
        timeoutMs: 360_000,
      }
    );

    if (result.data) {
      const status = (result.data.task_status || '').toLowerCase();
      const url = result.data.task_result?.videos?.[0]?.url || result.data.task_result?.video_url;
      if (['succeed', 'succeeded', 'success', 'done', 'completed'].includes(status) && url) {
        return { url };
      }
    }
    if (result.data.task_status === 'failed') {
      throw new Error(`Kling failed: ${result.data.task_status_msg ?? 'unknown'}`);
    }
    throw new Error('Kling timed out');
  },
});

