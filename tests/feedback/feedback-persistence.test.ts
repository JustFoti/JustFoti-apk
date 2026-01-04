/**
 * Property-Based Tests for Feedback Submission Persistence
 * Feature: vercel-to-cloudflare-migration, Property 9: Feedback Submission Persistence
 * Validates: Requirements 13.9
 * 
 * Tests that feedback submitted is stored in D1 and retrievable via the admin API.
 * Uses a mock D1 implementation to test the feedback persistence logic.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import * as fc from 'fast-check';
import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
  D1Env,
} from '../../app/lib/db/d1-connection';
import {
  queryD1,
  queryD1First,
  executeD1,
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
  private autoIncrementCounters: Map<string, number>;

  constructor(
    sql: string, 
    storage: Map<string, MockRow[]>,
    autoIncrementCounters: Map<string, number>
  ) {
    this.sql = sql;
    this.storage = storage;
    this.autoIncrementCounters = autoIncrementCounters;
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
    const selectMatch = this.sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const tableName = selectMatch[2];
      let rows = this.storage.get(tableName) || [];
      
      // Handle WHERE clause with simple equality
      const whereMatch = this.sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch && this.boundParams.length > 0) {
        const column = whereMatch[1];
        const value = this.boundParams[0];
        rows = rows.filter(row => row[column] === value);
      }

      // Handle ORDER BY
      const orderMatch = this.sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)?/i);
      if (orderMatch) {
        const orderColumn = orderMatch[1];
        const orderDir = orderMatch[2]?.toUpperCase() === 'ASC' ? 1 : -1;
        rows = [...rows].sort((a, b) => {
          const aVal = a[orderColumn] as string | number | null;
          const bVal = b[orderColumn] as string | number | null;
          if (aVal === null || aVal === undefined) return 1 * orderDir;
          if (bVal === null || bVal === undefined) return -1 * orderDir;
          if (aVal < bVal) return -1 * orderDir;
          if (aVal > bVal) return 1 * orderDir;
          return 0;
        });
      }

      // Handle LIMIT
      const limitMatch = this.sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        rows = rows.slice(0, limit);
      }
      
      return rows as T[];
    }

    // Parse COUNT queries
    const countMatch = this.sql.match(/SELECT\s+COUNT\(\*\)\s+as\s+(\w+)\s+FROM\s+(\w+)/i);
    if (countMatch) {
      const alias = countMatch[1];
      const tableName = countMatch[2];
      const rows = this.storage.get(tableName) || [];
      return [{ [alias]: rows.length }] as T[];
    }

    // Parse GROUP BY queries for status/type counts
    const groupMatch = this.sql.match(/SELECT\s+(\w+),\s*COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)\s+GROUP\s+BY\s+(\w+)/i);
    if (groupMatch) {
      const groupColumn = groupMatch[1];
      const tableName = groupMatch[2];
      const rows = this.storage.get(tableName) || [];
      
      const counts = new Map<string, number>();
      rows.forEach(row => {
        const key = String(row[groupColumn] || 'unknown');
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      
      return Array.from(counts.entries()).map(([key, count]) => ({
        [groupColumn]: key,
        count,
      })) as T[];
    }

    return [];
  }

  private async executeWrite(): Promise<{ changes: number; lastRowId: number }> {
    // Parse INSERT queries
    const insertMatch = this.sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2].split(',').map(c => c.trim());
      const valuesStr = insertMatch[3];
      
      // Parse values - handle ?, 'literal', datetime('now'), etc.
      const values: (string | null)[] = [];
      let currentValue = '';
      let inQuote = false;
      let parenDepth = 0;
      
      for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];
        
        if (char === "'" && valuesStr[i - 1] !== '\\') {
          inQuote = !inQuote;
          currentValue += char;
        } else if (char === '(' && !inQuote) {
          parenDepth++;
          currentValue += char;
        } else if (char === ')' && !inQuote) {
          parenDepth--;
          currentValue += char;
        } else if (char === ',' && !inQuote && parenDepth === 0) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      if (currentValue.trim()) {
        values.push(currentValue.trim());
      }
      
      if (!this.storage.has(tableName)) {
        this.storage.set(tableName, []);
      }
      if (!this.autoIncrementCounters.has(tableName)) {
        this.autoIncrementCounters.set(tableName, 0);
      }
      
      const rows = this.storage.get(tableName)!;
      const counter = this.autoIncrementCounters.get(tableName)! + 1;
      this.autoIncrementCounters.set(tableName, counter);
      
      const newRow: MockRow = { id: counter };
      
      let paramIdx = 0;
      columns.forEach((col, idx) => {
        const valueTemplate = values[idx] || '?';
        
        // Handle datetime('now') and other SQL functions
        if (valueTemplate.includes("datetime('now')") || valueTemplate.includes('datetime(')) {
          newRow[col] = new Date().toISOString();
        } else if (valueTemplate === '?') {
          // Placeholder - use bound parameter
          newRow[col] = this.boundParams[paramIdx++];
        } else if (valueTemplate.startsWith("'") && valueTemplate.endsWith("'")) {
          // Literal string value - remove quotes
          newRow[col] = valueTemplate.slice(1, -1);
        } else {
          // Other literal (number, etc.)
          newRow[col] = valueTemplate;
        }
      });
      
      // Set created_at if not already set
      if (!newRow.created_at) {
        newRow.created_at = new Date().toISOString();
      }
      
      rows.push(newRow);
      return { changes: 1, lastRowId: counter };
    }

    // Parse UPDATE queries
    const updateMatch = this.sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereColumn = updateMatch[3];
      const whereValue = this.boundParams[this.boundParams.length - 1];
      
      const rows = this.storage.get(tableName) || [];
      let changes = 0;
      
      rows.forEach(row => {
        if (row[whereColumn] === whereValue) {
          // Parse SET clause
          const setParts = setClause.split(',').map(s => s.trim());
          let paramIdx = 0;
          setParts.forEach(part => {
            const [col] = part.split('=').map(s => s.trim());
            if (part.includes("datetime('now')")) {
              row[col] = new Date().toISOString();
            } else if (part.includes('?')) {
              row[col] = this.boundParams[paramIdx++];
            }
          });
          changes++;
        }
      });
      
      return { changes, lastRowId: 0 };
    }

    // Parse DELETE queries
    const deleteMatch = this.sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const whereColumn = deleteMatch[2];
      const whereValue = this.boundParams[0];
      
      const rows = this.storage.get(tableName) || [];
      const initialLength = rows.length;
      const filtered = rows.filter(row => row[whereColumn] !== whereValue);
      this.storage.set(tableName, filtered);
      
      return { changes: initialLength - filtered.length, lastRowId: 0 };
    }

    return { changes: 0, lastRowId: 0 };
  }
}

class MockD1Database implements D1Database {
  private storage: Map<string, MockRow[]> = new Map();
  private autoIncrementCounters: Map<string, number> = new Map();

  prepare(query: string): D1PreparedStatement {
    return new MockD1PreparedStatement(query, this.storage, this.autoIncrementCounters);
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
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

  getStorage(): Map<string, MockRow[]> {
    return this.storage;
  }

  clear(): void {
    this.storage.clear();
    this.autoIncrementCounters.clear();
  }
}

// ============================================
// Test Data Types
// ============================================

interface Feedback {
  id?: number;
  type: 'bug' | 'feature' | 'general' | 'content';
  message: string;
  email?: string | null;
  url?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  screenshot?: string | null;
  status: 'new' | 'reviewed' | 'resolved' | 'archived';
  admin_response?: string | null;
  responded_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Property-Based Tests
// ============================================

describe('Feedback Submission Persistence', () => {
  let mockDb: MockD1Database;
  let mockEnv: D1Env;

  beforeEach(() => {
    mockDb = new MockD1Database();
    mockEnv = { DB: mockDb };
    
    // Inject mock into global context for getD1Database
    (globalThis as unknown as { __cf_env__?: D1Env }).__cf_env__ = mockEnv;
  });

  test('Property 9: Feedback Submission Persistence - Basic Feedback', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 9: Feedback Submission Persistence
     * Validates: Requirements 13.9
     * 
     * For any valid feedback submission (type, message), submitting it SHALL result
     * in the feedback being stored in D1 and retrievable via the admin API.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('bug', 'feature', 'general', 'content') as fc.Arbitrary<'bug' | 'feature' | 'general' | 'content'>,
          message: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
          email: fc.option(fc.emailAddress(), { nil: null }),
          url: fc.option(fc.webUrl(), { nil: null }),
          ip_address: fc.option(fc.ipV4(), { nil: null }),
        }),
        async (feedbackData) => {
          // Clear storage before each test
          mockDb.clear();

          // Submit feedback (simulating the POST /api/feedback endpoint)
          const insertResult = await executeD1(
            `INSERT INTO feedback (type, message, email, url, ip_address, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`,
            [
              feedbackData.type,
              feedbackData.message.trim(),
              feedbackData.email,
              feedbackData.url,
              feedbackData.ip_address,
            ],
            mockEnv
          );

          // Verify insertion succeeded
          expect(insertResult.success).toBe(true);
          expect(insertResult.error).toBeNull();
          expect(insertResult.lastRowId).toBeGreaterThan(0);

          // Retrieve feedback (simulating the GET /api/admin/feedback endpoint)
          const queryResult = await queryD1<Feedback>(
            'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 1',
            [],
            mockEnv
          );

          // Verify retrieval succeeded
          expect(queryResult.error).toBeNull();
          expect(queryResult.data).not.toBeNull();
          expect(queryResult.data!.length).toBe(1);

          // Verify data integrity
          const retrieved = queryResult.data![0];
          expect(retrieved.type).toBe(feedbackData.type);
          expect(retrieved.message).toBe(feedbackData.message.trim());
          expect(retrieved.email).toBe(feedbackData.email);
          expect(retrieved.url).toBe(feedbackData.url);
          expect(retrieved.ip_address).toBe(feedbackData.ip_address);
          expect(retrieved.status).toBe('new');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Feedback Submission Persistence - With Screenshot', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 9: Feedback Submission Persistence
     * Validates: Requirements 13.9
     * 
     * For any valid feedback with screenshot, the screenshot data SHALL be preserved.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('bug', 'feature', 'general', 'content') as fc.Arbitrary<'bug' | 'feature' | 'general' | 'content'>,
          message: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          // Generate a valid base64 data URL for screenshot
          screenshot: fc.option(
            fc.base64String({ minLength: 10, maxLength: 100 }).map(s => `data:image/png;base64,${s}`),
            { nil: null }
          ),
        }),
        async (feedbackData) => {
          // Clear storage before each test
          mockDb.clear();

          // Submit feedback with screenshot
          const insertResult = await executeD1(
            `INSERT INTO feedback (type, message, screenshot, status, created_at, updated_at)
             VALUES (?, ?, ?, 'new', datetime('now'), datetime('now'))`,
            [
              feedbackData.type,
              feedbackData.message.trim(),
              feedbackData.screenshot,
            ],
            mockEnv
          );

          expect(insertResult.success).toBe(true);

          // Retrieve and verify screenshot is preserved
          const queryResult = await queryD1First<Feedback>(
            'SELECT * FROM feedback WHERE id = ?',
            [insertResult.lastRowId],
            mockEnv
          );

          expect(queryResult.error).toBeNull();
          expect(queryResult.data).not.toBeNull();
          expect(queryResult.data!.screenshot).toBe(feedbackData.screenshot);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Feedback Submission Persistence - Status Updates', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 9: Feedback Submission Persistence
     * Validates: Requirements 13.9
     * 
     * For any feedback, status updates SHALL be persisted correctly.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('bug', 'feature', 'general', 'content') as fc.Arbitrary<'bug' | 'feature' | 'general' | 'content'>,
          message: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          newStatus: fc.constantFrom('reviewed', 'resolved', 'archived') as fc.Arbitrary<'reviewed' | 'resolved' | 'archived'>,
        }),
        async (testData) => {
          // Clear storage before each test
          mockDb.clear();

          // Insert initial feedback
          const insertResult = await executeD1(
            `INSERT INTO feedback (type, message, status, created_at, updated_at)
             VALUES (?, ?, 'new', datetime('now'), datetime('now'))`,
            [testData.type, testData.message.trim()],
            mockEnv
          );

          expect(insertResult.success).toBe(true);
          const feedbackId = insertResult.lastRowId;

          // Update status (simulating PATCH /api/admin/feedback)
          const updateResult = await executeD1(
            `UPDATE feedback SET status = ?, updated_at = datetime('now') WHERE id = ?`,
            [testData.newStatus, feedbackId],
            mockEnv
          );

          expect(updateResult.success).toBe(true);

          // Verify status was updated
          const queryResult = await queryD1First<Feedback>(
            'SELECT * FROM feedback WHERE id = ?',
            [feedbackId],
            mockEnv
          );

          expect(queryResult.error).toBeNull();
          expect(queryResult.data).not.toBeNull();
          expect(queryResult.data!.status).toBe(testData.newStatus);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Feedback Submission Persistence - Deletion', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 9: Feedback Submission Persistence
     * Validates: Requirements 13.9
     * 
     * For any feedback, deletion SHALL remove it from the database.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('bug', 'feature', 'general', 'content') as fc.Arbitrary<'bug' | 'feature' | 'general' | 'content'>,
          message: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
        }),
        async (feedbackData) => {
          // Clear storage before each test
          mockDb.clear();

          // Insert feedback
          const insertResult = await executeD1(
            `INSERT INTO feedback (type, message, status, created_at, updated_at)
             VALUES (?, ?, 'new', datetime('now'), datetime('now'))`,
            [feedbackData.type, feedbackData.message.trim()],
            mockEnv
          );

          expect(insertResult.success).toBe(true);
          const feedbackId = insertResult.lastRowId;

          // Verify it exists
          const beforeDelete = await queryD1First<Feedback>(
            'SELECT * FROM feedback WHERE id = ?',
            [feedbackId],
            mockEnv
          );
          expect(beforeDelete.data).not.toBeNull();

          // Delete feedback (simulating DELETE /api/admin/feedback)
          const deleteResult = await executeD1(
            'DELETE FROM feedback WHERE id = ?',
            [feedbackId],
            mockEnv
          );

          expect(deleteResult.success).toBe(true);
          expect(deleteResult.changes).toBe(1);

          // Verify it's gone
          const afterDelete = await queryD1First<Feedback>(
            'SELECT * FROM feedback WHERE id = ?',
            [feedbackId],
            mockEnv
          );
          expect(afterDelete.data).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Feedback Submission Persistence - Multiple Submissions', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 9: Feedback Submission Persistence
     * Validates: Requirements 13.9
     * 
     * Multiple feedback submissions SHALL all be stored and retrievable.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('bug', 'feature', 'general', 'content') as fc.Arbitrary<'bug' | 'feature' | 'general' | 'content'>,
            message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (feedbackList) => {
          // Clear storage before each test
          mockDb.clear();

          // Insert all feedback items
          for (const feedback of feedbackList) {
            const result = await executeD1(
              `INSERT INTO feedback (type, message, status, created_at, updated_at)
               VALUES (?, ?, 'new', datetime('now'), datetime('now'))`,
              [feedback.type, feedback.message.trim()],
              mockEnv
            );
            expect(result.success).toBe(true);
          }

          // Retrieve all feedback
          const queryResult = await queryD1<Feedback>(
            'SELECT * FROM feedback',
            [],
            mockEnv
          );

          expect(queryResult.error).toBeNull();
          expect(queryResult.data).not.toBeNull();
          expect(queryResult.data!.length).toBe(feedbackList.length);

          // Verify each feedback item exists
          for (const feedback of feedbackList) {
            const found = queryResult.data!.find(
              f => f.type === feedback.type && f.message === feedback.message.trim()
            );
            expect(found).toBeDefined();
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
