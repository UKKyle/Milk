import { supabase, hasValidSupabaseConfig } from './supabase';
import * as localDb from './db';
import { OfflineQueueItem } from '../types';

let isProcessingQueue = false;

// Process the offline mutation queue with exponential retry logic
export async function processOfflineQueue(
  onStatusChange?: (state: { isSyncing: boolean; failedCount: number }) => void
): Promise<void> {
  if (isProcessingQueue || !hasValidSupabaseConfig || !navigator.onLine) return;
  isProcessingQueue = true;

  try {
    const queue = await localDb.getQueueItems();
    if (queue.length === 0) {
      if (onStatusChange) onStatusChange({ isSyncing: false, failedCount: 0 });
      isProcessingQueue = false;
      return;
    }

    if (onStatusChange) onStatusChange({ isSyncing: true, failedCount: 0 });

    let failedCount = 0;

    for (const item of queue) {
      if (item.status === 'failed' && item.attempt_count >= 50) {
        failedCount++;
        continue; // Keep blocked item but warning visible, prevent blocking other entries
      }

      try {
        item.attempt_count++;
        item.last_attempt_at = new Date().toISOString();

        let error = null;

        if (item.operation === 'create') {
          const { error: err } = await supabase.from('sessions').insert(item.payload);
          error = err;
        } else if (item.operation === 'update') {
          const { error: err } = await supabase
            .from('sessions')
            .update(item.payload)
            .eq('id', item.payload.id);
          error = err;
        } else if (item.operation === 'delete') {
          const { error: err } = await supabase
            .from('sessions')
            .delete()
            .eq('id', item.payload.id);
          error = err;
        }

        if (error) throw error;

        // Mutation succeeded! Purge from local offline queue
        await localDb.deleteQueueItem(item.id);
      } catch (err) {
        console.error(`Sync iteration failed for operation ${item.operation} (attempt ${item.attempt_count}):`, err);
        item.status = 'failed';
        await localDb.addQueueItem(item);
        failedCount++;
      }
    }

    if (onStatusChange) {
      onStatusChange({ isSyncing: false, failedCount });
    }
  } catch (e) {
    console.error('Offline queue execution error:', e);
  } finally {
    isProcessingQueue = false;
  }
}
