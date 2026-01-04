/**
 * Server-only Database Connection
 * Wrapper to avoid client-side imports of Node.js modules
 * 
 * After migration to Cloudflare, this now uses D1 via the adapter.
 */

import { getAdapter, type DatabaseAdapter } from './adapter';
import { getD1Database } from './d1-connection';

// Singleton adapter instance
let adapterInstance: DatabaseAdapter | null = null;

/**
 * Initialize the database connection (D1)
 * This is a no-op for D1 as it's initialized via bindings
 */
export async function initializeDB(): Promise<void> {
  // D1 is initialized via Cloudflare bindings, no explicit init needed
  adapterInstance = getAdapter();
}

/**
 * Get the database adapter instance
 */
export function getDB(): DatabaseAdapter {
  if (!adapterInstance) {
    adapterInstance = getAdapter();
  }
  return adapterInstance;
}

/**
 * Get the raw D1 database instance
 * Use this when you need direct D1 access
 */
export function getD1() {
  return getD1Database();
}

// Re-export adapter types for convenience
export type { DatabaseAdapter } from './adapter';
export { adapterQuery, adapterExecute, pgToSqlite } from './adapter';
