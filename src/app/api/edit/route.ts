import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 600;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';

const EDIT_PROMPT_BASE = `ROLE
Expert AI photo editor. Subtly edit an existing image based on user text. Do not change the person, pose, or existing clothes unless specifically asked.

REQUIREMENTS
1) Preserve the base image (face, body, pose).
2) Apply the requested edit realistically (e.g., adding an accessory, changing an item's color).
3) Match the lighting, shadows, and perspective of the original image.
4) Keep the plain white background unchanged.`;

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

async function callOpenAIWithBlob(baseBlob: Blob, instruction: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const fd = new FormData();
  fd.append('model', 'gpt-image-1');
  fd.append('prompt', `${EDIT_PROMPT_BASE}\n\nUSER REQUEST\n${instruction}`);
  fd.append('size', '1024x1024');
  fd.append('n', '1');
  fd.append('response_format', 'b64_json');
  fd.append('image', baseBlob, 'base.jpg');
  const res = await fetch(`${OPENAI_BASE_URL}/v1/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
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
    const { baseImageUrl, instruction } = (await req.json()) as { baseImageUrl: string; instruction: string };
    if (!baseImageUrl || !instruction) return new Response('Missing params', { status: 400 });
    const blob = await inputToBlob(baseImageUrl);
    const calls = [
      callOpenAIWithBlob(blob, instruction),
      callOpenAIWithBlob(blob, instruction),
      callOpenAIWithBlob(blob, instruction),
      callOpenAIWithBlob(blob, instruction),
    ];
    const images = await Promise.all(calls);
    return Response.json({ images });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}


