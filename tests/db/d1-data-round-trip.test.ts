/**
 * Property-Based Tests for D1 Data Round-Trip Consistency
 * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
 * Validates: Requirements 3.2, 3.3, 3.4
 * 
 * Tests that data written to D1 and read back produces equivalent objects.
 * Uses a mock D1 implementation to test the connection utility logic.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import * as fc from 'fast-check';
import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
  D1Env,
  QueryResult,
  ExecuteResult,
} from '../../app/lib/db/d1-connection';
import {
  queryD1,
  queryD1First,
  executeD1,
  batchD1,
  transactionD1,
  safeRowConvert,
} from '../../app/lib/db/d1-connection';

// ============================================
// Mock D1 Implementation for Testing
// ============================================

interface MockRow {
  [key: string]: unknown;
}

class MockD1PreparedStatement implements D1PreparedStatement {
  private sql: string;
  private boundParams: unknown[] = [];
  private storage: Map<string, MockRow[]>;

  constructor(sql: string, storage: Map<string, MockRow[]>) {
    this.sql = sql;
    this.storage = storage;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this.boundParams = values;
    return this;
  }

  async first<T = unknown>(_colName?: string): Promise<T | null> {
    const results = await this.executeQuery<T>();
    return results.length > 0 ? results[0] : null;
  }

  async run(): Promise<D1Result> {
    const result = await this.executeWrite();
    return {
      results: [],
      success: true,
      meta: {
        duration: 1,
        changes: result.changes,
        last_row_id: result.lastRowId,
        served_by: 'mock',
      },
    };
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const results = await this.executeQuery<T>();
    return {
      results,
      success: true,
      meta: {
        duration: 1,
        changes: 0,
        last_row_id: 0,
        served_by: 'mock',
      },
    };
  }

  async raw<T = unknown>(): Promise<T[]> {
    return this.executeQuery<T>();
  }

  private async executeQuery<T>(): Promise<T[]> {
    // Parse SELECT queries
    const selectMatch = this.sql.match(/SELECT\s+\*\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const tableName = selectMatch[1];
      const rows = this.storage.get(tableName) || [];
      
      // Handle WHERE clause with simple equality
      const whereMatch = this.sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch && this.boundParams.length > 0) {
        const column = whereMatch[1];
        const value = this.boundParams[0];
        return rows.filter(row => row[column] === value) as T[];
      }
      
      return rows as T[];
    }
    return [];
  }

  private async executeWrite(): Promise<{ changes: number; lastRowId: number }> {
    // Parse INSERT queries
    const insertMatch = this.sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2].split(',').map(c => c.trim());
      
      if (!this.storage.has(tableName)) {
        this.storage.set(tableName, []);
      }
      
      const rows = this.storage.get(tableName)!;
      const newRow: MockRow = { id: rows.length + 1 };
      
      columns.forEach((col, idx) => {
        newRow[col] = this.boundParams[idx];
      });
      
      rows.push(newRow);
      return { changes: 1, lastRowId: rows.length };
    }

    // Parse UPDATE queries
    const updateMatch = this.sql.match(/UPDATE\s+(\w+)\s+SET/i);
    if (updateMatch) {
      return { changes: 1, lastRowId: 0 };
    }

    // Parse DELETE queries
    const deleteMatch = this.sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const rows = this.storage.get(tableName) || [];
      
      const whereMatch = this.sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch && this.boundParams.length > 0) {
        const column = whereMatch[1];
        const value = this.boundParams[0];
        const initialLength = rows.length;
        const filtered = rows.filter(row => row[column] !== value);
        this.storage.set(tableName, filtered);
        return { changes: initialLength - filtered.length, lastRowId: 0 };
      }
      
      this.storage.set(tableName, []);
      return { changes: rows.length, lastRowId: 0 };
    }

    return { changes: 0, lastRowId: 0 };
  }
}

class MockD1Database implements D1Database {
  private storage: Map<string, MockRow[]> = new Map();

  prepare(query: string): D1PreparedStatement {
    return new MockD1PreparedStatement(query, this.storage);
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      // For batch operations, we need to run() the statement first to execute writes,
      // then return the result in the expected format
      const runResult = await stmt.run();
      results.push({
        results: [] as T[],
        success: runResult.success,
        meta: runResult.meta,
      });
    }
    return results;
  }

  async exec(_query: string): Promise<{ count: number; duration: number }> {
    return { count: 1, duration: 1 };
  }

  // Helper to get storage for testing
  getStorage(): Map<string, MockRow[]> {
    return this.storage;
  }

  // Helper to clear storage
  clear(): void {
    this.storage.clear();
  }
}

// ============================================
// Test Data Types
// ============================================

interface AdminUser {
  id?: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'super_admin';
  created_at?: string;
  last_login?: string | null;
}

interface Feedback {
  id?: number;
  type: 'bug' | 'feature' | 'general' | 'content';
  message: string;
  email?: string | null;
  url?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  status: 'new' | 'reviewed' | 'resolved' | 'archived';
}

interface WatchSession {
  id?: string;
  fingerprint_id: string;
  content_id: string;
  content_type: 'movie' | 'tv';
  watch_time: number;
  completion_rate: number;
}

// ============================================
// Property-Based Tests
// ============================================

describe('D1 Data Round-Trip Consistency', () => {
  let mockDb: MockD1Database;
  let mockEnv: D1Env;

  beforeEach(() => {
    mockDb = new MockD1Database();
    mockEnv = { DB: mockDb };
    
    // Inject mock into global context for getD1Database
    (globalThis as unknown as { __cf_env__?: D1Env }).__cf_env__ = mockEnv;
  });

  test('Property 1: D1 Data Round-Trip Consistency - Admin Users', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
     * Validates: Requirements 3.2, 3.3, 3.4
     * 
     * For any valid admin user data, writing it to D1 and reading it back
     * SHALL produce an equivalent object.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          password_hash: fc.string({ minLength: 60, maxLength: 60 }),
          role: fc.constantFrom('admin', 'super_admin') as fc.Arbitrary<'admin' | 'super_admin'>,
        }),
        async (userData) => {
          // Clear storage before each test
          mockDb.clear();

          // Write admin user to D1
          const insertResult = await executeD1(
            'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
            [userData.username, userData.password_hash, userData.role],
            mockEnv
          );

          expect(insertResult.success).toBe(true);
          expect(insertResult.error).toBeNull();

          // Read back the admin user
          const queryResult = await queryD1First<AdminUser>(
            'SELECT * FROM admin_users WHERE username = ?',
            [userData.username],
            mockEnv
          );

          expect(queryResult.error).toBeNull();
          expect(queryResult.data).not.toBeNull();

          // Verify data integrity
          const retrieved = queryResult.data!;
          expect(retrieved.username).toBe(userData.username);
          expect(retrieved.password_hash).toBe(userData.password_hash);
          expect(retrieved.role).toBe(userData.role);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: D1 Data Round-Trip Consistency - Feedback', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
     * Validates: Requirements 3.2, 3.3, 3.4
     * 
     * For any valid feedback data, writing it to D1 and reading it back
     * SHALL produce an equivalent object.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('bug', 'feature', 'general', 'content') as fc.Arbitrary<'bug' | 'feature' | 'general' | 'content'>,
          message: fc.string({ minLength: 1, maxLength: 2000 }),
          email: fc.option(fc.emailAddress(), { nil: null }),
          status: fc.constantFrom('new', 'reviewed', 'resolved', 'archived') as fc.Arbitrary<'new' | 'reviewed' | 'resolved' | 'archived'>,
        }),
        async (feedbackData) => {
          // Clear storage before each test
          mockDb.clear();

          // Write feedback to D1
          const insertResult = await executeD1(
            'INSERT INTO feedback (type, message, email, status) VALUES (?, ?, ?, ?)',
            [feedbackData.type, feedbackData.message, feedbackData.email, feedbackData.status],
            mockEnv
          );

          expect(insertResult.success).toBe(true);
          expect(insertResult.error).toBeNull();

          // Read back all feedback
          const queryResult = await queryD1<Feedback>(
            'SELECT * FROM feedback',
            [],
            mockEnv
          );

          expect(queryResult.error).toBeNull();
          expect(queryResult.data).not.toBeNull();
          expect(queryResult.data!.length).toBeGreaterThan(0);

          // Verify data integrity
          const retrieved = queryResult.data![0];
          expect(retrieved.type).toBe(feedbackData.type);
          expect(retrieved.message).toBe(feedbackData.message);
          expect(retrieved.email).toBe(feedbackData.email);
          expect(retrieved.status).toBe(feedbackData.status);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: D1 Data Round-Trip Consistency - Watch Sessions', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
     * Validates: Requirements 3.2, 3.3, 3.4
     * 
     * For any valid watch session data, writing it to D1 and reading it back
     * SHALL produce an equivalent object.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fingerprint_id: fc.string({ minLength: 10, maxLength: 64 }),
          content_id: fc.string({ minLength: 1, maxLength: 20 }),
          content_type: fc.constantFrom('movie', 'tv') as fc.Arbitrary<'movie' | 'tv'>,
          watch_time: fc.integer({ min: 0, max: 36000 }), // 0 to 10 hours in seconds
          completion_rate: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        async (sessionData) => {
          // Clear storage before each test
          mockDb.clear();

          // Write watch session to D1
          const insertResult = await executeD1(
            'INSERT INTO watch_sessions (fingerprint_id, content_id, content_type, watch_time, completion_rate) VALUES (?, ?, ?, ?, ?)',
            [
              sessionData.fingerprint_id,
              sessionData.content_id,
              sessionData.content_type,
              sessionData.watch_time,
              sessionData.completion_rate,
            ],
            mockEnv
          );

          expect(insertResult.success).toBe(true);
          expect(insertResult.error).toBeNull();

          // Read back the watch session
          const queryResult = await queryD1First<WatchSession>(
            'SELECT * FROM watch_sessions WHERE fingerprint_id = ?',
            [sessionData.fingerprint_id],
            mockEnv
          );

          expect(queryResult.error).toBeNull();
          expect(queryResult.data).not.toBeNull();

          // Verify data integrity
          const retrieved = queryResult.data!;
          expect(retrieved.fingerprint_id).toBe(sessionData.fingerprint_id);
          expect(retrieved.content_id).toBe(sessionData.content_id);
          expect(retrieved.content_type).toBe(sessionData.content_type);
          expect(retrieved.watch_time).toBe(sessionData.watch_time);
          expect(retrieved.completion_rate).toBe(sessionData.completion_rate);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Batch operations preserve data integrity', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
     * Validates: Requirements 3.2, 3.3
     * 
     * Batch operations should execute atomically and preserve data integrity.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            password_hash: fc.string({ minLength: 60, maxLength: 60 }),
            role: fc.constantFrom('admin', 'super_admin'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (users) => {
          // Clear storage before each test
          mockDb.clear();

          // Create batch insert statements
          const statements = users.map((user, idx) => ({
            sql: 'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
            params: [`${user.username}_${idx}`, user.password_hash, user.role],
          }));

          // Execute batch
          const results = await batchD1(statements, mockEnv);

          // All operations should succeed
          expect(results.length).toBe(users.length);
          results.forEach(result => {
            expect(result.error).toBeNull();
          });

          // Verify all users were inserted
          const queryResult = await queryD1<AdminUser>(
            'SELECT * FROM admin_users',
            [],
            mockEnv
          );

          expect(queryResult.error).toBeNull();
          expect(queryResult.data!.length).toBe(users.length);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Transaction operations are atomic', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
     * Validates: Requirements 3.2, 3.3
     * 
     * Transaction operations should execute atomically.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          password_hash: fc.string({ minLength: 60, maxLength: 60 }),
        }),
        async (userData) => {
          // Clear storage before each test
          mockDb.clear();

          // Execute transaction with multiple operations
          const result = await transactionD1([
            {
              sql: 'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
              params: [userData.username, userData.password_hash, 'admin'],
            },
            {
              sql: 'INSERT INTO feedback (type, message, status) VALUES (?, ?, ?)',
              params: ['general', `Welcome ${userData.username}`, 'new'],
            },
          ], mockEnv);

          expect(result.success).toBe(true);
          expect(result.error).toBeNull();

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('safeRowConvert handles null and undefined correctly', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
     * Validates: Requirements 3.3
     * 
     * The safeRowConvert helper should handle null/undefined values correctly.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.record({
            id: fc.integer(),
            name: fc.string(),
          })
        ),
        (input) => {
          const result = safeRowConvert<{ id: number; name: string }>(input);

          if (input === null || input === undefined) {
            expect(result).toBeNull();
          } else {
            expect(result).not.toBeNull();
            expect(result).toEqual(input);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Query results include metadata', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 1: D1 Data Round-Trip Consistency
     * Validates: Requirements 3.2
     * 
     * Query results should include metadata about the operation.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        async (username) => {
          // Clear storage before each test
          mockDb.clear();

          // Insert a user
          await executeD1(
            'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, 'hash123456789012345678901234567890123456789012345678901234', 'admin'],
            mockEnv
          );

          // Query with metadata
          const result = await queryD1<AdminUser>(
            'SELECT * FROM admin_users',
            [],
            mockEnv
          );

          expect(result.error).toBeNull();
          expect(result.meta).toBeDefined();
          expect(typeof result.meta?.duration).toBe('number');
          expect(typeof result.meta?.changes).toBe('number');
          expect(typeof result.meta?.lastRowId).toBe('number');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
