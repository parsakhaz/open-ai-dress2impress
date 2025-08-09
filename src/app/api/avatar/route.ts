import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 600;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';

const AVATAR_PROMPT = `ROLE
You are a photo-editing AI. Transform the provided face photo into a single, full-body fashion model avatar.

REQUIREMENTS
1) Preserve the person’s facial likeness.
2) Full-body, neutral forward-facing standing pose.
3) Background: plain white seamless studio (#FFFFFF).
4) Attire: simple, form-fitting, plain grey basics (tank top + leggings).
5) Photorealistic, well-lit, high-resolution output.`;

async function inputToBlob(imageInput: string): Promise<Blob> {
  if (imageInput.startsWith('data:')) {
    const match = imageInput.match(/^data:(.*?);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URL');
    const mime = match[1];
    const b64 = match[2];
    const buffer = Buffer.from(b64, 'base64');
    return new Blob([buffer], { type: mime });
  }
  const res = await fetch(imageInput);
  const ab = await res.arrayBuffer();
  return new Blob([ab], { type: res.headers.get('content-type') || 'image/jpeg' });
}

async function callOpenAIWithBlob(imageBlob: Blob): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const fd = new FormData();
  fd.append('model', 'gpt-image-1');
  fd.append('prompt', AVATAR_PROMPT);
  fd.append('size', '1024x1024');
  fd.append('n', '1');
  fd.append('response_format', 'b64_json');
  fd.append('image', imageBlob, 'input.jpg');
  const res = await fetch(`${OPENAI_BASE_URL}/v1/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
    // don't set Content-Type; fetch sets it with boundary
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned');
  return `data:image/png;base64,${b64}`;
}

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl } = (await req.json()) as { imageDataUrl: string };
    if (!imageDataUrl) return new Response('Missing imageDataUrl', { status: 400 });
    const blob = await inputToBlob(imageDataUrl);
    const calls = [callOpenAIWithBlob(blob), callOpenAIWithBlob(blob), callOpenAIWithBlob(blob), callOpenAIWithBlob(blob)];
    const images = await Promise.all(calls);
    return Response.json({ images });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}


