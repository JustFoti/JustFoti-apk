/**
 * Setup Security Tables Script
 * Creates audit logs table and updates admin users table with roles and permissions
 */

const { initializeDB, getDB } = require('./db-connection.js');

async function setupSecurityTables() {
  console.log('Setting up security tables...');
  
  try {
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    
    console.log('Database initialized successfully');

    // Create audit_logs table
    console.log('Creating audit_logs table...');
    
    if (db.isUsingNeon()) {
      // PostgreSQL syntax for Neon
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          action_type VARCHAR(100) NOT NULL,
          user_id VARCHAR(50) NOT NULL,
          username VARCHAR(100) NOT NULL,
          timestamp BIGINT NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          session_id VARCHAR(100),
          target_resource VARCHAR(100),
          target_id VARCHAR(100),
          action_details JSONB,
          success BOOLEAN DEFAULT true,
          error_message TEXT,
          duration INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes for better query performance
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_resource, target_id)
      `);
      
    } else {
      // SQLite syntax
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action_type TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          target_resource TEXT,
          target_id TEXT,
          action_details TEXT,
          success INTEGER DEFAULT 1,
          error_message TEXT,
          duration INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )
      `);
      
      // Create indexes
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_resource, target_id)
      `);
    }
    
    console.log('✅ audit_logs table created successfully');

    // Update admin_users table to include role column if it doesn't exist
    console.log('Updating admin_users table...');
    
    try {
      if (db.isUsingNeon()) {
        // Check if role column exists
        const columns = await adapter.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'admin_users' AND column_name = 'role'
        `);
        
        if (columns.length === 0) {
          await adapter.execute(`
            ALTER TABLE admin_users ADD COLUMN role VARCHAR(50) DEFAULT 'viewer'
          `);
          console.log('✅ Added role column to admin_users table');
        } else {
          console.log('✅ Role column already exists in admin_users table');
        }
        
      } else {
        // For SQLite, we need to check differently
        const tableInfo = await adapter.query(`PRAGMA table_info(admin_users)`);
        const hasRoleColumn = tableInfo.some(col => col.name === 'role');
        
        if (!hasRoleColumn) {
          await adapter.execute(`
            ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'viewer'
          `);
          console.log('✅ Added role column to admin_users table');
        } else {
          console.log('✅ Role column already exists in admin_users table');
        }
      }
    } catch (error) {
      console.log('Note: Could not update admin_users table (may not exist yet):', error.message);
    }

    // Create session_security table for enhanced session management
    console.log('Creating session_security table...');
    
    if (db.isUsingNeon()) {
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS session_security (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          session_id VARCHAR(100) NOT NULL UNIQUE,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          login_method VARCHAR(50) DEFAULT 'password',
          security_flags JSONB
        )
      `);
      
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_session_security_user_id ON session_security(user_id)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_session_security_session_id ON session_security(session_id)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_session_security_active ON session_security(is_active, expires_at)
      `);
      
    } else {
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS session_security (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          session_id TEXT NOT NULL UNIQUE,
          ip_address TEXT,
          user_agent TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          last_activity INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          expires_at INTEGER,
          is_active INTEGER DEFAULT 1,
          login_method TEXT DEFAULT 'password',
          security_flags TEXT
        )
      `);
      
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_session_security_user_id ON session_security(user_id)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_session_security_session_id ON session_security(session_id)
      `);
      await adapter.execute(`
        CREATE INDEX IF NOT EXISTS idx_session_security_active ON session_security(is_active, expires_at)
      `);
    }
    
    console.log('✅ session_security table created successfully');

    console.log('\n🎉 Security tables setup completed successfully!');
    console.log('\nTables created:');
    console.log('- audit_logs: For comprehensive audit logging');
    console.log('- session_security: For enhanced session management');
    console.log('- admin_users: Updated with role column');
    
  } catch (error) {
    console.error('❌ Error setting up security tables:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupSecurityTables()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupSecurityTables };