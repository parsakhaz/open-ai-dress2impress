import { getGeneration, saveGeneration, pruneGenerations } from '@/lib/data/avatarGenerationRepo';
import { saveImage, getImage } from '@/lib/data/imageRepo';
import { hashGenerationParams } from '@/lib/util/genParams';
import { generateAvatarFromSelfie } from '@/lib/adapters/avatar';

async function urlsToImageIds(urls: string[]): Promise<string[]> {
  // If urls are data URLs already, we can store them as-is. If remote, fetch and convert to blob/data URL if needed.
  const ids: string[] = [];
  for (const u of urls) {
    // Assume data URLs for current generator output
    const id = await saveImage(u);
    ids.push(id);
  }
  return ids;
}

async function imageIdsToDataUrls(imageIds: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const id of imageIds) {
    const data = await getImage(id);
    if (data) out.push(data);
  }
  return out;
}

export async function getOrGenerateForFace(
  faceImageId: string,
  dataUrl: string,
  params?: Record<string, unknown>
): Promise<{ urls: string[]; fromCache: boolean }> {
  const paramsHash = hashGenerationParams(params);
  const existing = await getGeneration(faceImageId, paramsHash);
  if (existing) {
    const urls = await imageIdsToDataUrls(existing.variantImageIds);
    return { urls, fromCache: true };
  }

  const urls = await generateAvatarFromSelfie(dataUrl);
  // Guard: if generator returns empty, throw to surface error in UI
  if (!urls || urls.length === 0) {
    throw new Error('No avatars generated');
  }
  const imageIds = await urlsToImageIds(urls);
  await saveGeneration({ faceImageId, variantImageIds: imageIds, paramsHash });
  void pruneGenerations();
  return { urls, fromCache: false };
}


