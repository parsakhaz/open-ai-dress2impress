import type { GamePhase, Character, WardrobeItem } from '@/types';

const DB_NAME = 'dress-to-impress-db';
const DB_VERSION = 1;
const STORE_NAME = 'gameState';

interface PersistedState {
  phase: GamePhase;
  theme: string;
  character: Character | null;
  wardrobe: WardrobeItem[];
  currentImageUrl: string | null;
  history: any[];
}

class GamePersistence {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  async saveState(state: PersistedState): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, 'currentGame');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadState(): Promise<PersistedState | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('currentGame');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearState(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('currentGame');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const gamePersistence = new GamePersistence();
