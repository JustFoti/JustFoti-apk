/**
 * Database Connection for Scripts
 * JavaScript version of the neon-connection for use in Node.js scripts
 * This is a standalone version that doesn't require TypeScript compilation
 */

const { neon } = require('@neondatabase/serverless');
const path = require('path');
const fs = require('fs');

// Database interface for consistent API
class NeonAdapter {
  constructor(connectionString) {
    this.sql = neon(connectionString);
  }

  createTemplateString(sql) {
    // Create a proper template literal for Neon
    const templateStrings = [sql];
    templateStrings.raw = [sql];
    return templateStrings;
  }

  async query(sql, params = []) {
    if (params.length === 0) {
      // For DDL statements without parameters, use template literal
      const templateStrings = this.createTemplateString(sql);
      return await this.sql(templateStrings);
    }
    // Use neon's query method for parameterized queries
    return await this.sql.query(sql, params);
  }

  async execute(sql, params = []) {
    if (params.length === 0) {
      // For DDL statements without parameters, use template literal
      const templateStrings = this.createTemplateString(sql);
      return await this.sql(templateStrings);
    }
    // Use neon's query method for parameterized queries
    const result = await this.sql.query(sql, params);
    return result;
  }

  close() {
    // Neon connections are automatically managed
  }
}

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
    this.isNeon = false;
  }

  async initialize() {
    if (this.isInitialized && this.adapter) {
      return;
    }

    try {
      // Check for Neon connection string
      const neonConnectionString = process.env.DATABASE_URL;
      
      if (neonConnectionString && neonConnectionString.includes('neon.tech')) {
        // Use Neon for production
        console.log('🔌 Initializing Neon PostgreSQL connection...');
        this.adapter = new NeonAdapter(neonConnectionString);
        this.isNeon = true;
        console.log('✅ Neon PostgreSQL database initialized successfully');
      } else {
        // Use SQLite for local development
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
        this.isNeon = false;
        console.log('✅ SQLite database initialized successfully');
      }

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

  isUsingNeon() {
    return this.isNeon;
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