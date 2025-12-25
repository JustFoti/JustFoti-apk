/**
 * Server-only Database Connection
 * Wrapper to avoid client-side imports of Node.js modules
 */

import { initializeDB as initDB, getDB as getDatabase } from './neon-connection';

// Re-export server-only functions
export const initializeDB = initDB;
export const getDB = getDatabase;