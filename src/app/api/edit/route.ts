import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { guards } from '@/lib/util/validation';
import { fetchBlob } from '@/lib/util/http';
import { parallel } from '@/lib/util/promise';
import { editImageWithBlob } from '@/lib/server/openai';

export const runtime = 'nodejs';
export const maxDuration = 600;

const EDIT_PROMPT_BASE = `ROLE
Expert AI photo editor. Subtly edit an existing image based on user text. Do not change the person, pose, or existing clothes unless specifically asked.

REQUIREMENTS
1) Preserve the base image (face, body, pose).
2) Apply the requested edit realistically (e.g., adding an accessory, changing an item's color).
3) Match the lighting, shadows, and perspective of the original image.
4) Keep the plain white background unchanged.`;

export const POST = createHandler<{ baseImageUrl: string; instruction: string }, { images: string[] }>({
  parse: async (req: NextRequest) => guards.edit(await req.json()),
  handle: async ({ baseImageUrl, instruction }) => {
    const blob = await fetchBlob(baseImageUrl);
    const prompt = `${EDIT_PROMPT_BASE}\n\nUSER REQUEST\n${instruction}`;
    const images = await parallel(4, () => editImageWithBlob(blob, prompt, { size: '1024x1536', timeoutMs: 120_000 }));
    return { images };
  },
});

