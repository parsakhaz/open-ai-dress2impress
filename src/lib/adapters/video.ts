import { api } from '@/lib/api/client';

export async function generateWalkoutVideo(finalImageURL: string): Promise<string> {
  const { url } = await api.video({ imageUrl: finalImageURL });
  return url;
}


