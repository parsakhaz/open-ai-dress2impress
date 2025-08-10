import { db } from './db';
import type { ImageRecord } from '@/types';

export async function saveImage(data: string): Promise<string> {
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rec: ImageRecord = { id, data, createdAt: Date.now() };
  await db.images.put(rec);
  return id;
}

export async function getImage(id: string): Promise<string | null> {
  const rec = await db.images.get(id);
  return rec?.data ?? null;
}

export async function deleteImage(id: string): Promise<void> {
  await db.images.delete(id);
}


