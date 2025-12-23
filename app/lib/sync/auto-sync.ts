/**
 * Auto-Sync Utility
 * Automatically syncs data to the server when changes occur
 */

import { getSyncStatus, collectLocalSyncData } from './sync-client';
import { getSyncEndpoint, isUsingCloudflareSyncWorker } from '@/lib/utils/sync-endpoints';

// Debounce timer for batching rapid changes
let syncDebounceTimer: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 3000; // Wait 3 seconds after last change before syncing (reduced from 5s)

// Track if a sync is in progress
let isSyncing = false;

// Track last sync time to prevent too frequent syncs
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL_MS = 5000; // Minimum 5 seconds between syncs (reduced from 10s)

/**
 * Queue a sync operation (debounced)
 * Call this whenever local data changes that should be synced
 */
export function queueSync(): void {
  if (typeof window === 'undefined') return;
  
  const status = getSyncStatus();
  if (!status.isLinked || !status.syncCode) {
    return; // Not linked, don't sync
  }
  
  // Clear existing timer
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  
  // Set new timer
  syncDebounceTimer = setTimeout(() => {
    performSync();
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Queue an immediate sync (shorter debounce for critical events like watch progress)
 * Use this for watch progress updates that need faster sync
 */
export function queueImmediateSync(): void {
  if (typeof window === 'undefined') return;
  
  const status = getSyncStatus();
  if (!status.isLinked || !status.syncCode) {
    return;
  }
  
  // Clear existing timer
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  
  // Shorter debounce for immediate sync (1 second)
  syncDebounceTimer = setTimeout(() => {
    performSync();
  }, 1000);
}

/**
 * Perform immediate sync (no debounce)
 */
export async function performSync(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser' };
  }
  
  const status = getSyncStatus();
  if (!status.isLinked || !status.syncCode) {
    return { success: false, error: 'Not linked' };
  }
  
  if (isSyncing) {
    return { success: false, error: 'Sync already in progress' };
  }
  
  // Check minimum interval
  const now = Date.now();
  if (now - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
    // Queue for later instead of skipping
    queueSync();
    return { success: false, error: 'Too soon, queued for later' };
  }
  
  isSyncing = true;
  lastSyncTime = now;
  
  try {
    const localData = collectLocalSyncData();
    const endpoint = getSyncEndpoint();
    
    console.log(`[AutoSync] Pushing to ${isUsingCloudflareSyncWorker() ? 'Cloudflare Worker' : 'Vercel API'}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Sync-Code': status.syncCode,
    };
    
    if (status.passphrase) {
      headers['X-Sync-Passphrase'] = status.passphrase;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(localData),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Sync failed');
    }
    
    // Update last sync timestamp
    localStorage.setItem('flyx_last_sync', result.lastSyncedAt.toString());
    
    console.log('[AutoSync] Sync completed successfully');
    return { success: true };
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Sync failed';
    console.error('[AutoSync] Sync failed:', errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    isSyncing = false;
  }
}

/**
 * Cancel any pending sync
 */
export function cancelPendingSync(): void {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}
