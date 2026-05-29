// Core Type Declarations for Milk Tracker

export type SessionType = 'left' | 'right' | 'bottle' | 'pump';

export interface Session {
  id: string; // UUID
  family_id: string; // Derived hash string
  type: SessionType;
  side: 'left' | 'right' | null;
  started_at: string; // ISO string
  ended_at: string | null; // ISO string
  duration_s: number | null;
  volume_ml: number | null;
  notes: string | null;
  recorded_by: string; // Partner Name
  device_id: string; // Browser device identifier
  created_at: string;
  updated_at: string;
}

export interface OfflineQueueItem {
  id: string; // Local operation ID
  operation: 'create' | 'update' | 'delete';
  payload: Partial<Session> & { id: string }; // Session data containing UUID
  created_at: string;
  attempt_count: number;
  last_attempt_at: string | null;
  status: 'pending' | 'failed';
}

export interface Family {
  id: string;
  created_at?: string;
}

export interface SyncStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  failedCount: number;
}
