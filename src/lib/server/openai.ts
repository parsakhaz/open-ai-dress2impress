import { getServerEnv } from '@/lib/util/env';
import { typedFetch } from '@/lib/util/http';

export async function editImageWithBlob(
  blob: Blob,
  prompt: string,
  options?: { size?: '1024x1024' | '1024x1536' | '1536x1024' }
): Promise<string> {
  const { OPENAI_API_KEY, OPENAI_BASE_URL } = getServerEnv();
  const fd = new FormData();
  fd.append('model', 'gpt-image-1');
  fd.append('prompt', prompt);
  fd.append('size', options?.size ?? '1024x1024');
  fd.append('n', '1');
  fd.append('image', blob, 'input.jpg');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const data = await typedFetch<{ data?: { b64_json?: string; url?: string }[] }>(`${OPENAI_BASE_URL}/v1/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: fd,
      signal: controller.signal as any,
    }, { apiName: 'OpenAI' });
    const first = data?.data?.[0];
    const image = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : first?.url;
    if (!image) throw new Error('No image data returned');
    return image;
  } finally {
    clearTimeout(timer);
  }
}


