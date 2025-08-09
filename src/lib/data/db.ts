import Dexie, { Table } from 'dexie';
import type { Character, WardrobeItem, HistoryState } from '@/types';

export class AppDatabase extends Dexie {
  characters!: Table<Character>;
  items!: Table<WardrobeItem>;
  history!: Table<HistoryState>;

  constructor() {
    super('DressToImpressDB');
    this.version(1).stores({
      characters: 'id',
      items: 'id, category',
      history: '++id, createdAt',
    });
  }
}

export const db = new AppDatabase();


