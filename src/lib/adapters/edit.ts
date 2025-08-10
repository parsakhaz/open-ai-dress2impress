// OpenAI Images Edits adapter for general image editing

import { api } from '@/lib/api/client';

export async function editImage(baseImageUrl: string, userInstruction: string): Promise<string[]> {
  const { images } = await api.edit({ baseImageUrl, instruction: userInstruction });
  return images;
}


