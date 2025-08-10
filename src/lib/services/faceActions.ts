import { saveImage } from '@/lib/data/imageRepo';
import { addFace, pruneFaces } from '@/lib/data/faceRepo';

export async function saveFaceImage(
  dataUrl: string,
  opts: { pinned?: boolean; label?: string } = {}
): Promise<{ faceId: string; imageId: string }> {
  const imageId = await saveImage(dataUrl);
  const faceId = await addFace(imageId, opts);
  void pruneFaces();
  return { faceId, imageId };
}


