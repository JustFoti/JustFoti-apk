/**
 * Database Connection Management
 * Handles SQLite connection pooling and lifecycle
 */

import { Database } from 'bun:sqlite';
import path from 'path';
import { ALL_TABLES, SCHEMA_VERSION, TABLES } from './schema';

interface DatabaseConfig {
  filename: string;
  readonly?: boolean;
  create?: boolean;
  readwrite?: boolean;
}

class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private db: Database | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  private constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Get singleton database instance
   */
  static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      const defaultConfig: DatabaseConfig = {
        filename: path.join(process.cwd(), 'server', 'db', 'analytics.db'),
        create: true,
        readwrite: true,
      };
      DatabaseConnection.instance = new DatabaseConnection(config || defaultConfig);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    try {
      // Create database connection
      this.db = new Database(this.config.filename, {
        create: this.config.create,
        readwrite: this.config.readwrite,
        readonly: this.config.readonly,
      });

      // Enable WAL mode for better concurrency
      this.db.exec('PRAGMA journal_mode = WAL;');
      
      // Enable foreign keys
      this.db.exec('PRAGMA foreign_keys = ON;');
      
      // Set synchronous mode for better performance
      this.db.exec('PRAGMA synchronous = NORMAL;');
      
      // Set cache size (negative value = KB)
      this.db.exec('PRAGMA cache_size = -64000;'); // 64MB cache

      // Create all tables
      for (const tableSQL of ALL_TABLES) {
        this.db.exec(tableSQL);
      }

      // Check and update schema version
      await this.ensureSchemaVersion();

      this.isInitialized = true;
      console.log('✓ Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Ensure schema version is tracked
   */
  private async ensureSchemaVersion(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existingVersion = this.db
      .query(`SELECT version FROM ${TABLES.SCHEMA_MIGRATIONS} ORDER BY version DESC LIMIT 1`)
      .get() as { version: number } | null;

    if (!existingVersion) {
      // First time setup
      this.db
        .query(`INSERT INTO ${TABLES.SCHEMA_MIGRATIONS} (version, name) VALUES (?, ?)`)
        .run(SCHEMA_VERSION, 'initial_schema');
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): Database {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a query with error handling
   */
  executeQuery<T = any>(query: string, params: any[] = []): T {
    try {
      const db = this.getDatabase();
      const stmt = db.query(query);
      return stmt.get(...params) as T;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw new Error(`Query failed: ${error}`);
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  transaction<T>(callback: (db: Database) => T): T {
    const db = this.getDatabase();
    try {
      db.exec('BEGIN TRANSACTION;');
      const result = callback(db);
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      db.exec('ROLLBACK;');
      console.error('Transaction failed:', error);
      throw new Error(`Transaction failed: ${error}`);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      DatabaseConnection.instance = null;
      console.log('✓ Database connection closed');
    }
  }

  /**
   * Check if database is healthy
   */
  healthCheck(): boolean {
    try {
      const db = this.getDatabase();
      const result = db.query('SELECT 1 as health').get() as { health: number };
      return result.health === 1;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  getStats(): {
    pageCount: number;
    pageSize: number;
    freePages: number;
    sizeBytes: number;
  } {
    const db = this.getDatabase();
    const pageCount = (db.query('PRAGMA page_count').get() as any).page_count || 0;
    const pageSize = (db.query('PRAGMA page_size').get() as any).page_size || 0;
    const freePages = (db.query('PRAGMA freelist_count').get() as any).freelist_count || 0;
    
    return {
      pageCount,
      pageSize,
      freePages,
      sizeBytes: pageCount * pageSize,
    };
  }

  /**
   * Optimize database (vacuum and analyze)
   */
  optimize(): void {
    const db = this.getDatabase();
    console.log('Optimizing database...');
    db.exec('VACUUM;');
    db.exec('ANALYZE;');
    console.log('✓ Database optimized');
  }
}

// Export singleton getter
export const getDB = (config?: DatabaseConfig) => DatabaseConnection.getInstance(config);

// Export for direct access
export { DatabaseConnection };
