/**
 * Database Connection for Scripts
 * 
 * This script provides database connectivity for local development and scripts.
 * After the Cloudflare migration, D1 is the primary database.
 * SQLite is used for local development/testing.
 * 
 * For D1 operations, use wrangler d1 commands or the D1 REST API.
 */

const path = require('path');
const fs = require('fs');

// SQLite adapter for local development
class SQLiteAdapter {
  constructor(dbPath) {
    // Dynamic import based on runtime
    let Database;
    if (typeof Bun !== 'undefined') {
      const { Database: BunDatabase } = require('bun:sqlite');
      Database = BunDatabase;
    } else {
      Database = require('better-sqlite3');
    }
    
    this.db = new Database(dbPath);
    
    // Configure SQLite
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
  }

  async query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async execute(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  close() {
    this.db.close();
  }
}

class DatabaseConnection {
  constructor() {
    this.adapter = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized && this.adapter) {
      return;
    }

    try {
      // Use SQLite for local development/scripts
      console.log('🔌 Initializing SQLite for local development...');
      const dbDir = path.join(process.cwd(), 'data');
      
      try {
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }
      } catch (error) {
        console.warn('Cannot create data directory, using in-memory SQLite');
      }
      
      const dbPath = fs.existsSync(dbDir) 
        ? path.join(dbDir, 'analytics.db')
        : ':memory:';
        
      this.adapter = new SQLiteAdapter(dbPath);
      console.log('✅ SQLite database initialized successfully');
      console.log('ℹ️  Note: For production D1 operations, use wrangler d1 commands');

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  getAdapter() {
    if (!this.adapter || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.adapter;
  }

  close() {
    if (this.adapter) {
      this.adapter.close();
      this.adapter = null;
      this.isInitialized = false;
      console.log('✓ Database connection closed');
    }
  }
}

// Export singleton instance
let dbInstance = null;

const initializeDB = async () => {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
    await dbInstance.initialize();
  }
  return dbInstance;
};

const getDB = () => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDB() first.');
  }
  return dbInstance;
};

module.exports = {
  initializeDB,
  getDB,
  DatabaseConnection
};
