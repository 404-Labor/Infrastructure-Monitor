import type { WatchDogEvent } from '../types';

const DB_NAME = 'watchdog-offline';
const STORE_NAME = 'events';
const DB_VERSION = 1;

export class OfflineQueue {
  public async push(events: WatchDogEvent[]): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const event of events) {
      store.add(event);
    }

    await completeTransaction(transaction);
    db.close();
  }

  public async drain(limit = 100): Promise<WatchDogEvent[]> {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const events: WatchDogEvent[] = [];
    const keys: IDBValidKey[] = [];

    await new Promise<void>((resolve, reject) => {
      const request = store.openCursor();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || events.length >= limit) {
          resolve();
          return;
        }

        events.push(cursor.value as WatchDogEvent);
        keys.push(cursor.primaryKey);
        cursor.continue();
      };
    });

    for (const key of keys) {
      store.delete(key);
    }

    await completeTransaction(transaction);
    db.close();
    return events;
  }
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    };
  });
}

async function completeTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
