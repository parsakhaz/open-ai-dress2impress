import Dexie, { Table } from 'dexie';
import type { Character, WardrobeItem, HistoryState, ImageRecord } from '@/types';

export class AppDatabase extends Dexie {
  characters!: Table<Character>;
  items!: Table<WardrobeItem>;
  history!: Table<HistoryState>;
  images!: Table<ImageRecord>;

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
  }
}

export const db = new AppDatabase();


