import { db } from '@/lib/data/db';
import type { TryOnJob, TryOnStatus, WardrobeItem } from '@/types';
import { stableHash } from '@/lib/util/hash';

export function getBaseImageKey(baseImageId: string | null | undefined, baseImageUrl: string): string {
  return baseImageId || stableHash(baseImageUrl);
}

export async function getJobByPair(baseImageKey: string, itemId: string): Promise<TryOnJob | undefined> {
  const rows = await db.tryOnJobs.where('[baseImageKey+itemId]').equals([baseImageKey, itemId]).toArray();
  return rows[0];
}

export async function upsertQueuedJob(params: {
  baseImageId?: string | null;
  baseImageUrl: string;
  item: WardrobeItem;
}): Promise<TryOnJob> {
  const baseImageKey = getBaseImageKey(params.baseImageId, params.baseImageUrl);
  const existing = await getJobByPair(baseImageKey, params.item.id);
  const now = Date.now();
  if (existing) return existing;
  const job: TryOnJob = {
    id: `job_${now}_${Math.random().toString(36).slice(2, 8)}`,
    baseImageKey,
    baseImageUrl: params.baseImageUrl,
    baseImageId: params.baseImageId ?? undefined,
    itemId: params.item.id,
    itemImageUrl: params.item.imageUrl,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  };
  await db.tryOnJobs.put(job);
  return job;
}

export async function updateJobStatus(id: string, status: TryOnStatus, patch?: Partial<TryOnJob>): Promise<void> {
  const existing = await db.tryOnJobs.get(id);
  if (!existing) return;
  await db.tryOnJobs.put({ ...existing, ...patch, status, updatedAt: Date.now() });
}

export async function listQueued(limit = 50): Promise<TryOnJob[]> {
  return db.tryOnJobs.where('status').equals('queued').limit(limit).toArray();
}

export async function listRunning(): Promise<TryOnJob[]> {
  return db.tryOnJobs.where('status').equals('running').toArray();
}

export async function getResultsByPair(baseImageKey: string, itemId: string): Promise<string[] | undefined> {
  const job = await getJobByPair(baseImageKey, itemId);
  if (job?.status === 'succeeded' && job.images?.length) return job.images;
  return undefined;
}

export async function getLatestSucceededByItem(itemId: string): Promise<TryOnJob | undefined> {
  const rows = await db.tryOnJobs
    .where('status')
    .equals('succeeded')
    .and((j) => j.itemId === itemId && Array.isArray(j.images) && j.images.length > 0)
    .sortBy('updatedAt');
  return rows[rows.length - 1];
}

export async function getJobsByItem(itemId: string): Promise<TryOnJob[]> {
  // Aggregate across statuses; we only have an index on status, so query by status then filter by itemId
  const [succeeded, running, queued, failed] = await Promise.all([
    db.tryOnJobs.where('status').equals('succeeded').and((j) => j.itemId === itemId).toArray(),
    db.tryOnJobs.where('status').equals('running').and((j) => j.itemId === itemId).toArray(),
    db.tryOnJobs.where('status').equals('queued').and((j) => j.itemId === itemId).toArray(),
    db.tryOnJobs.where('status').equals('failed').and((j) => j.itemId === itemId).toArray(),
  ]);
  const all = [...succeeded, ...running, ...queued, ...failed];
  all.sort((a, b) => a.updatedAt - b.updatedAt);
  return all;
}

export async function getAllImagesByItem(itemId: string): Promise<string[]> {
  const jobs = await getJobsByItem(itemId);
  const set = new Set<string>();
  for (const j of jobs) {
    if (j.status === 'succeeded' && Array.isArray(j.images)) {
      for (const url of j.images) set.add(url);
    }
  }
  return Array.from(set);
}


