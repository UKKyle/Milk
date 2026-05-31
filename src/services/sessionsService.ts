import { supabase, hasValidSupabaseConfig } from './supabase';
import { Session, OfflineQueueItem } from '../types';
import * as localDb from './db';

const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function getRetentionCutoffIso(): string {
  return new Date(Date.now() - RETENTION_MS).toISOString();
}

async function pruneRetainedSessions(familyId: string): Promise<void> {
  const cutoffIso = getRetentionCutoffIso();

  await localDb.deleteLocalSessionsBefore(familyId, cutoffIso);

  if (!hasValidSupabaseConfig || !navigator.onLine) return;

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('family_id', familyId)
    .lt('started_at', cutoffIso);

  if (error) {
    console.warn('Failed to prune old family sessions:', error.message);
  }
}

// Device identifier management
export async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await localDb.getMetadata('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now();
    await localDb.setMetadata('device_id', deviceId);
  }
  return deviceId;
}

// Normalized SHA-256 derivation of family code
export async function deriveFamilyId(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  if (!normalized) throw new Error('Family code cannot be empty');

  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const sessionsService = {
  // Bootstrap family entry if missing on server
  async bootstrapFamily(familyId: string): Promise<void> {
    if (!hasValidSupabaseConfig) return;
    try {
      const { error } = await supabase
        .from('families')
        .upsert({ id: familyId }, { onConflict: 'id' });
      
      if (error && error.code !== '23505') { // Ignore unique constraint violation
        console.warn('Family bootstrap warning:', error.message);
      }

      await pruneRetainedSessions(familyId);
    } catch (e) {
      console.error('Failed to bootstrap family remote status:', e);
    }
  },

  // Remote loading with offline caching backup
  async getSessions(familyId: string): Promise<Session[]> {
    const cutoffIso = getRetentionCutoffIso();

    if (!hasValidSupabaseConfig) {
      await localDb.deleteLocalSessionsBefore(familyId, cutoffIso);
      return localDb.getLocalSessions(familyId);
    }

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('family_id', familyId)
        .gte('started_at', cutoffIso)
        .order('started_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const typedData = data as Session[];
        for (const item of typedData) {
          await localDb.saveLocalSession(item);
        }
        await localDb.deleteLocalSessionsBefore(familyId, cutoffIso);
        return localDb.getLocalSessions(familyId);
      }
    } catch (e) {
      console.warn('Network read failed, falling back to local DB cache:', e);
    }

    await localDb.deleteLocalSessionsBefore(familyId, cutoffIso);
    return localDb.getLocalSessions(familyId);
  },

  // Single abstraction layer for CRUD actions supporting queuing
  async createSession(session: Omit<Session, 'device_id'>): Promise<Session> {
    const deviceId = await getOrCreateDeviceId();
    const fullSession: Session = { ...session, device_id: deviceId };

    // 1. Instantly update local IndexedDB cache (optimistic local source)
    await localDb.saveLocalSession(fullSession);

    // 2. Queue mutation or push to network
    if (hasValidSupabaseConfig && navigator.onLine) {
      try {
        const { error } = await supabase.from('sessions').insert(fullSession);
        if (error) throw error;
      } catch (err) {
        console.warn('Post error, queueing create mutation offline:', err);
        await this.queueMutation('create', fullSession);
      }
    } else {
      await this.queueMutation('create', fullSession);
    }

    return fullSession;
  },

  async updateSession(session: Session): Promise<Session> {
    await localDb.saveLocalSession(session);

    if (hasValidSupabaseConfig && navigator.onLine) {
      try {
        const { error } = await supabase
          .from('sessions')
          .update(session)
          .eq('id', session.id);
        if (error) throw error;
      } catch (err) {
        console.warn('Put error, queueing update mutation offline:', err);
        await this.queueMutation('update', session);
      }
    } else {
      await this.queueMutation('update', session);
    }

    return session;
  },

  async deleteSession(id: string, familyId: string): Promise<void> {
    await localDb.deleteLocalSession(id);

    if (hasValidSupabaseConfig && navigator.onLine) {
      try {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Delete error, queueing delete mutation offline:', err);
        await this.queueMutation('delete', { id, family_id: familyId } as any);
      }
    } else {
      await this.queueMutation('delete', { id, family_id: familyId } as any);
    }
  },

  async queueMutation(operation: 'create' | 'update' | 'delete', payload: any): Promise<void> {
    const queueItem: OfflineQueueItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now(),
      operation,
      payload,
      created_at: new Date().toISOString(),
      attempt_count: 0,
      last_attempt_at: null,
      status: 'pending',
    };
    await localDb.addQueueItem(queueItem);
  }
};
