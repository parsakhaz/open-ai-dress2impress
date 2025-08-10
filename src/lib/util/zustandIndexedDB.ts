import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'dti-zustand';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return dbPromise;
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], mode);
    const store = tx.objectStore(STORE_NAME);
    fn(store).then(resolve).catch(reject);
    tx.onabort = () => reject(tx.error);
  });
}

export function createIndexedDBStorage(): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      return withStore('readonly', async (store) => {
        return await new Promise<string | null>((resolve, reject) => {
          const req = store.get(name);
          req.onsuccess = () => resolve((req.result as string) ?? null);
          req.onerror = () => reject(req.error);
        });
      });
    },
    setItem: async (name: string, value: string): Promise<void> => {
      await withStore('readwrite', async (store) => {
        return await new Promise<void>((resolve, reject) => {
          const req = store.put(value, name);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      });
    },
    removeItem: async (name: string): Promise<void> => {
      await withStore('readwrite', async (store) => {
        return await new Promise<void>((resolve, reject) => {
          const req = store.delete(name);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      });
    },
  };
}


