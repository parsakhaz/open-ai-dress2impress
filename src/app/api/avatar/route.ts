import { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';
import { guards } from '@/lib/util/validation';
import { fetchBlob } from '@/lib/util/http';
import { parallel } from '@/lib/util/promise';
import { editImageWithBlob } from '@/lib/server/openai';
import { logger } from '@/lib/util/logger';

export const runtime = 'nodejs';
export const maxDuration = 600;

const AVATAR_PROMPT = `Transform this person as a character in the exact stylized 3D art style of The Sims 4 by Electronic Arts.

Composition requirements (critical):
- Full-length, head-to-toe visible in frame (do not crop head, feet, hands, or any body part)
- Centered, straight-on, neutral standing pose
- Add small headroom and footroom (~5–8% margins top and bottom)
- Subject occupies ~80–90% of image height to ensure full body fits
- Isolated on plain white seamless studio background with a soft shadow

Style requirements:
- Start with a blank outfit: plain white t‑shirt and plain white pants (no logos, no patterns)
- Low‑poly look with clean, sharp edges and bright, clean textures
- Highly detailed and well-defined facial features faithful to Sims 4 models
- Smiling facial expression
- Clean render suitable for Photoshop cutout and composition`;

// Vary pose and gaze subtly rather than clothing; clothing remains white/blank
const styleVariations = [
  'pose: neutral, gaze straight ahead',
  'pose: neutral, gaze slightly upward',
  'pose: neutral, gaze slightly to the left',
  'pose: neutral, gaze slightly to the right',
] as const;

export const POST = createHandler<{ imageDataUrl: string }, { images: string[]}>({
  parse: async (req: NextRequest) => guards.avatar(await req.json()),
  handle: async ({ imageDataUrl }) => {
    const start = performance.now();
    const blob = await fetchBlob(imageDataUrl);
    const images = await parallel(4, async (i) => {
      const prompt = `${AVATAR_PROMPT}, ${styleVariations[i % styleVariations.length]}`;
      // Prefer a taller aspect to reduce chance of head/feet cropping
      return editImageWithBlob(blob, prompt, { size: '1024x1536' });
    });
    const duration = performance.now() - start;
    logger.success('AVATAR', 'Generated avatar images', { count: images.length, duration });
    return { images };
  },
});

