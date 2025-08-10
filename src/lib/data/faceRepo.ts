import { db } from './db';
import type { FaceRecord } from '@/types';

export async function addFace(
  imageId: string,
  opts: { pinned?: boolean; label?: string } = {}
): Promise<string> {
  const id = `face_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rec: FaceRecord = {
    id,
    imageId,
    createdAt: Date.now(),
    pinned: !!opts.pinned,
    label: opts.label,
  };
  await db.faces.put(rec);
  return id;
}

export async function getRecentFaces(limit = 20): Promise<FaceRecord[]> {
  return db.faces.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function getPinnedFaces(): Promise<FaceRecord[]> {
  return db.faces.where('pinned').equals(1 as any).toArray();
}

export async function deleteFace(id: string): Promise<void> {
  await db.faces.delete(id);
}

export async function pinFace(id: string, pinned: boolean): Promise<void> {
  await db.faces.update(id, { pinned });
}

export async function renameFace(id: string, label: string): Promise<void> {
  await db.faces.update(id, { label });
}

export async function clearAllFaces(): Promise<void> {
  await db.faces.clear();
}

export async function pruneFaces(maxCount = 50): Promise<void> {
  const all = await db.faces.orderBy('createdAt').toArray();
  const pinned = all.filter((f) => f.pinned);
  const unpinned = all.filter((f) => !f.pinned);
  const overflow = Math.max(0, pinned.length + unpinned.length - maxCount);
  if (overflow <= 0) return;
  const toDelete = unpinned.slice(0, overflow); // oldest unpinned first
  if (toDelete.length > 0) {
    await db.faces.bulkDelete(toDelete.map((f) => f.id));
  }
}


