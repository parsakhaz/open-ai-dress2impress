import { db } from './db';
import type { AvatarGenerationRecord } from '@/types';

export async function getGeneration(
  faceImageId: string,
  paramsHash = 'default'
): Promise<AvatarGenerationRecord | null> {
  // Prefer compound index when available
  try {
    const row = await (db.avatarGenerations as any)
      .where('[faceImageId+paramsHash]')
      .equals([faceImageId, paramsHash])
      .first();
    if (row) return row;
  } catch {
    // Fallback for older DB versions
  }
  const fallback = await db.avatarGenerations.where('faceImageId').equals(faceImageId).and((r) => r.paramsHash === paramsHash).first();
  return fallback ?? null;
}

export async function saveGeneration(
  rec: Omit<AvatarGenerationRecord, 'id' | 'createdAt'>
): Promise<string> {
  const id = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row: AvatarGenerationRecord = {
    id,
    createdAt: Date.now(),
    ...rec,
  };
  await db.avatarGenerations.put(row);
  return id;
}

export async function deleteGenerationsForFace(faceImageId: string): Promise<void> {
  await db.avatarGenerations.where('faceImageId').equals(faceImageId).delete();
}

export async function clearAllGenerations(): Promise<void> {
  await db.avatarGenerations.clear();
}

export async function pruneGenerations(maxFaces = 30): Promise<void> {
  // Keep latest generation per face, prune by oldest createdAt beyond maxFaces unique faces
  const all = await db.avatarGenerations.orderBy('createdAt').toArray();
  const byFace = new Map<string, AvatarGenerationRecord[]>();
  for (const g of all) {
    const arr = byFace.get(g.faceImageId) || [];
    arr.push(g);
    byFace.set(g.faceImageId, arr);
  }
  const faces = Array.from(byFace.entries()).sort(
    (a, b) => (b[1][b[1].length - 1]?.createdAt || 0) - (a[1][a[1].length - 1]?.createdAt || 0)
  );
  if (faces.length <= maxFaces) return;
  const overflow = faces.slice(maxFaces);
  for (const [faceId, rows] of overflow) {
    await db.avatarGenerations.bulkDelete(rows.map((r) => r.id));
  }
}


