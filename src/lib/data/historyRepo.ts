import { db } from './db';

export interface HistoryItemPersisted {
  id: string;
  imageId: string;
  type: 'avatar' | 'tryOn' | 'edit';
  description?: string;
  timestamp: number;
}

export async function addHistoryItem(item: Omit<HistoryItemPersisted, 'id' | 'timestamp'>): Promise<string> {
  const id = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rec: HistoryItemPersisted = { id, timestamp: Date.now(), ...item };
  await db.history.put({ id: rec.id, imageUrl: rec.imageId, createdAt: rec.timestamp } as any);
  // Note: `db.history` original schema uses imageUrl; we reuse that field to store imageId for now
  return id;
}

export async function getRecentHistory(limit = 10): Promise<HistoryItemPersisted[]> {
  const rows = await db.history.orderBy('createdAt').reverse().limit(limit).toArray();
  return rows.map((r) => ({
    id: String(r.id),
    imageId: r.imageUrl,
    type: 'edit',
    timestamp: r.createdAt,
  }));
}

export async function clearHistory(): Promise<void> {
  await db.history.clear();
}


