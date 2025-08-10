import Dexie, { Table } from 'dexie';
import type { Character, WardrobeItem, HistoryState, ImageRecord, FaceRecord, AvatarGenerationRecord } from '@/types';

export class AppDatabase extends Dexie {
  characters!: Table<Character>;
  items!: Table<WardrobeItem>;
  history!: Table<HistoryState>;
  images!: Table<ImageRecord>;
  faces!: Table<FaceRecord>;
  avatarGenerations!: Table<AvatarGenerationRecord>;
  tryOnJobs!: Table<import('@/types').TryOnJob>;

  constructor() {
    super('DressToImpressDB');
    this.version(1).stores({
      characters: 'id',
      items: 'id, category',
      history: '++id, createdAt',
    });
    this.version(2).stores({
      images: 'id, createdAt',
    });
    this.version(3).stores({
      faces: 'id, createdAt, pinned',
    });
    this.version(4).stores({
      avatarGenerations: 'id, faceImageId, paramsHash, createdAt',
    });
    // Add compound index for fast lookups by (faceImageId, paramsHash)
    this.version(5).stores({
      avatarGenerations: 'id, [faceImageId+paramsHash], faceImageId, paramsHash, createdAt',
    });
    this.version(6).stores({
      tryOnJobs: 'id, [baseImageKey+itemId], status, createdAt',
    });
  }
}

export const db = new AppDatabase();


