// OpenAI Images Edits adapter for avatar generation

import { api } from '@/lib/api/client';

export async function generateAvatarFromSelfie(selfieImageUrl: string): Promise<string[]> {
  const { images } = await api.avatar({ imageDataUrl: selfieImageUrl });
  return images;
}


