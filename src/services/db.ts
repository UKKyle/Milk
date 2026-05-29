import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Session, OfflineQueueItem } from '../types';

interface MilkTrackerDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: { 'by-started': string; 'by-family': string };
  };
  offlineQueue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-status': string };
  };
  keyValue: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'milk_tracker_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<MilkTrackerDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MilkTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Sessions Cache Store
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('by-started', 'started_at');
        sessionsStore.createIndex('by-family', 'family_id');

        // Queue for Offline Mutations
        const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        queueStore.createIndex('by-status', 'status');

        // Simple Key-Value store for local config metadata
        db.createObjectStore('keyValue');
      },
    }) as any;
  }
  return dbPromise!;
}

// Helper methods to interact with local DB stores
export async function getLocalSessions(familyId?: string): Promise<Session[]> {
  const db = await getDB();
  const sessions = familyId
    ? await db.getAllFromIndex('sessions', 'by-family', familyId)
    : await db.getAll('sessions');
  return sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

export async function saveLocalSession(session: Session): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function deleteLocalSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
}

export async function clearLocalSessions(): Promise<void> {
  const db = await getDB();
  await db.clear('sessions');
}

// Queue accessors
export async function getQueueItems(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return db.getAll('offlineQueue');
}

export async function addQueueItem(item: OfflineQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('offlineQueue', item);
}

export async function deleteQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('offlineQueue', id);
}

// Generic storage accessors
export async function getMetadata(key: string): Promise<any> {
  const db = await getDB();
  return db.get('keyValue', key);
}

export async function setMetadata(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('keyValue', value, key);
}
