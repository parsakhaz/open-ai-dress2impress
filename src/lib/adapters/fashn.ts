import { api } from '@/lib/api/client';

export async function performTryOn(characterImageUrl: string, clothingImageUrl: string): Promise<string[]> {
  const { images } = await api.tryon({ characterImageUrl, clothingImageUrl });
  return images;
}


