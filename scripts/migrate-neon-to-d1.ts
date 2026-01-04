/**
 * Migration Script: Neon → D1 Admin Data
 * 
 * Migrates admin_users, feedback, and bot_detections from Neon PostgreSQL to Cloudflare D1.
 * Uses the Cloudflare API directly for D1 operations.
 * 
 * Usage:
 *   npx tsx scripts/migrate-neon-to-d1.ts
 * 
 * Requirements:
 *   - DATABASE_URL in .env.local (Neon connection string)
 *   - CF_API_TOKEN environment variable (Cloudflare API token with D1 write access)
 *   - CF_ACCOUNT_ID environment variable (your Cloudflare account ID)
 * 
 * Requirements: 3.5
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const D1_DATABASE_ID = 'b7875a59-3876-4223-9c3d-7644c16f44a5'; // flyx-admin-db

// ============================================
// Types
// ============================================

interface AdminUser {
  id: string | number;
  username: string;
  password_hash: string;
  role?: string;
  created_at: string | number;
  last_login?: string | number | null;
}

interface Feedback {
  id: number;
  type: string;
  message: string;
  email?: string | null;
  url?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  screenshot?: string | null;
  status: string;
  admin_response?: string | null;
  responded_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface BotDetection {
  id: number;
  user_id: string;
  ip_address: string;
  user_agent?: string | null;
  confidence_score: number;
  detection_reasons: string | string[];
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: number | null;
  created_at: number;
  updated_at: number;
}

interface MigrationStats {
  adminUsers: { migrated: number; failed: number; skipped: number };
  feedback: { migrated: number; failed: number; skipped: number };
  botDetections: { migrated: number; failed: number; skipped: number };
}

// ============================================
// Neon Database Functions
// ============================================

/**
 * Parse Neon connection string to extract host and credentials
 */
function parseNeonConnectionString(connectionString: string): { host: string; user: string; password: string; database: string } {
  // Format: postgresql://user:password@host/database?sslmode=require
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1).split('?')[0], // Remove leading / and query params
  };
}

async function fetchFromNeon<T>(tableName: string, query: string): Promise<T[]> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not found in .env.local');
  }

  console.log(`📥 Fetching ${tableName} from Neon...`);
  
  const { host, password } = parseNeonConnectionString(DATABASE_URL);
  
  // Use Neon's serverless HTTP API
  // The host needs to be the project endpoint, not the pooler
  const apiHost = host.replace('-pooler', '');
  
  const response = await fetch(`https://${apiHost}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': DATABASE_URL,
    },
    body: JSON.stringify({
      query,
      params: [],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (text.includes('does not exist') || (text.includes('relation') && text.includes('does not exist'))) {
      console.log(`ℹ️  No ${tableName} table in Neon (no data to migrate)`);
      return [];
    }
    throw new Error(`Failed to fetch ${tableName} from Neon: ${response.status} - ${text}`);
  }

  const data = await response.json() as { rows: T[] };
  console.log(`✅ Found ${data.rows?.length || 0} ${tableName} records in Neon`);
  
  return data.rows || [];
}

// ============================================
// D1 Database Functions
// ============================================

async function executeD1Query(sql: string, params: unknown[] = []): Promise<unknown> {
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    throw new Error('CF_API_TOKEN and CF_ACCOUNT_ID required for D1 API access');
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    }
  );

  const data = await response.json() as { success: boolean; errors?: unknown[]; result?: unknown[] };
  if (!response.ok || !data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors || data)}`);
  }

  return data;
}

async function checkD1TableExists(tableName: string): Promise<boolean> {
  try {
    await executeD1Query(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function getD1RecordCount(tableName: string): Promise<number> {
  try {
    const result = await executeD1Query(`SELECT COUNT(*) as count FROM ${tableName}`) as { result: Array<{ results: Array<{ count: number }> }> };
    return result.result?.[0]?.results?.[0]?.count || 0;
  } catch {
    return 0;
  }
}

// ============================================
// Migration Functions
// ============================================

async function migrateAdminUsers(users: AdminUser[]): Promise<{ migrated: number; failed: number; skipped: number }> {
  const stats = { migrated: 0, failed: 0, skipped: 0 };
  
  if (users.length === 0) {
    console.log('ℹ️  No admin users to migrate');
    return stats;
  }

  console.log(`\n📤 Migrating ${users.length} admin users to D1...`);

  for (const user of users) {
    try {
      // Check if user already exists
      const existingResult = await executeD1Query(
        'SELECT id FROM admin_users WHERE username = ?',
        [user.username]
      ) as { result: Array<{ results: unknown[] }> };
      
      if (existingResult.result?.[0]?.results?.length > 0) {
        console.log(`  ⏭️  Skipped (exists): ${user.username}`);
        stats.skipped++;
        continue;
      }

      // Convert timestamps
      const createdAt = typeof user.created_at === 'number' 
        ? new Date(user.created_at).toISOString()
        : user.created_at;
      const lastLogin = user.last_login 
        ? (typeof user.last_login === 'number' ? new Date(user.last_login).toISOString() : user.last_login)
        : null;

      await executeD1Query(
        `INSERT INTO admin_users (username, password_hash, role, created_at, last_login) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          user.username,
          user.password_hash,
          user.role || 'admin',
          createdAt,
          lastLogin,
        ]
      );
      
      stats.migrated++;
      console.log(`  ✅ Migrated: ${user.username}`);
    } catch (error: unknown) {
      stats.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed: ${user.username} - ${errorMessage}`);
    }
  }

  return stats;
}

async function migrateFeedback(feedbackItems: Feedback[]): Promise<{ migrated: number; failed: number; skipped: number }> {
  const stats = { migrated: 0, failed: 0, skipped: 0 };
  
  if (feedbackItems.length === 0) {
    console.log('ℹ️  No feedback to migrate');
    return stats;
  }

  console.log(`\n📤 Migrating ${feedbackItems.length} feedback items to D1...`);

  for (const feedback of feedbackItems) {
    try {
      // Check if feedback already exists (by id or by message+created_at)
      const existingResult = await executeD1Query(
        'SELECT id FROM feedback WHERE message = ? AND created_at = ?',
        [feedback.message, feedback.created_at]
      ) as { result: Array<{ results: unknown[] }> };
      
      if (existingResult.result?.[0]?.results?.length > 0) {
        console.log(`  ⏭️  Skipped (exists): feedback #${feedback.id}`);
        stats.skipped++;
        continue;
      }

      await executeD1Query(
        `INSERT INTO feedback (type, message, email, url, user_agent, ip_address, screenshot, status, admin_response, responded_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          feedback.type,
          feedback.message,
          feedback.email || null,
          feedback.url || null,
          feedback.user_agent || null,
          feedback.ip_address || null,
          feedback.screenshot || null,
          feedback.status || 'new',
          feedback.admin_response || null,
          feedback.responded_at || null,
          feedback.created_at,
          feedback.updated_at,
        ]
      );
      
      stats.migrated++;
      console.log(`  ✅ Migrated: feedback #${feedback.id} (${feedback.type})`);
    } catch (error: unknown) {
      stats.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed: feedback #${feedback.id} - ${errorMessage}`);
    }
  }

  return stats;
}

async function migrateBotDetections(detections: BotDetection[]): Promise<{ migrated: number; failed: number; skipped: number }> {
  const stats = { migrated: 0, failed: 0, skipped: 0 };
  
  if (detections.length === 0) {
    console.log('ℹ️  No bot detections to migrate');
    return stats;
  }

  console.log(`\n📤 Migrating ${detections.length} bot detections to D1...`);

  for (const detection of detections) {
    try {
      // Check if detection already exists
      const existingResult = await executeD1Query(
        'SELECT id FROM bot_detections WHERE user_id = ? AND created_at = ?',
        [detection.user_id, detection.created_at]
      ) as { result: Array<{ results: unknown[] }> };
      
      if (existingResult.result?.[0]?.results?.length > 0) {
        console.log(`  ⏭️  Skipped (exists): detection for ${detection.user_id.substring(0, 20)}...`);
        stats.skipped++;
        continue;
      }

      // Convert detection_reasons to string if it's an array
      const detectionReasons = Array.isArray(detection.detection_reasons)
        ? JSON.stringify(detection.detection_reasons)
        : detection.detection_reasons;

      await executeD1Query(
        `INSERT INTO bot_detections (user_id, ip_address, user_agent, confidence_score, detection_reasons, status, reviewed_by, reviewed_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detection.user_id,
          detection.ip_address,
          detection.user_agent || null,
          detection.confidence_score,
          detectionReasons,
          detection.status || 'suspected',
          detection.reviewed_by || null,
          detection.reviewed_at || null,
          detection.created_at,
          detection.updated_at,
        ]
      );
      
      stats.migrated++;
      console.log(`  ✅ Migrated: detection for ${detection.user_id.substring(0, 20)}... (score: ${detection.confidence_score})`);
    } catch (error: unknown) {
      stats.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed: detection for ${detection.user_id.substring(0, 20)}... - ${errorMessage}`);
    }
  }

  return stats;
}

// ============================================
// Main Migration Function
// ============================================

async function main() {
  console.log('🚀 Neon → D1 Admin Data Migration\n');
  console.log('━'.repeat(60));
  console.log('This script migrates:');
  console.log('  • admin_users - Admin authentication data');
  console.log('  • feedback - User feedback submissions');
  console.log('  • bot_detections - Bot detection records');
  console.log('━'.repeat(60));

  // Check requirements
  if (!DATABASE_URL) {
    console.error('\n❌ DATABASE_URL not found in .env.local');
    console.error('   Set your Neon PostgreSQL connection string');
    process.exit(1);
  }

  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    console.error('\n❌ Missing Cloudflare credentials');
    console.error('   Set these environment variables:');
    console.error('   - CF_API_TOKEN: Cloudflare API token with D1 write access');
    console.error('   - CF_ACCOUNT_ID: Your Cloudflare account ID');
    console.error('\n   You can find these in your Cloudflare dashboard.');
    process.exit(1);
  }

  console.log('\n📋 Pre-migration checks...');
  
  // Check D1 tables exist
  const tablesExist = {
    admin_users: await checkD1TableExists('admin_users'),
    feedback: await checkD1TableExists('feedback'),
    bot_detections: await checkD1TableExists('bot_detections'),
  };

  console.log(`   admin_users table: ${tablesExist.admin_users ? '✅ exists' : '❌ missing'}`);
  console.log(`   feedback table: ${tablesExist.feedback ? '✅ exists' : '❌ missing'}`);
  console.log(`   bot_detections table: ${tablesExist.bot_detections ? '✅ exists' : '❌ missing'}`);

  if (!tablesExist.admin_users || !tablesExist.feedback || !tablesExist.bot_detections) {
    console.error('\n❌ Some D1 tables are missing. Run the schema initialization first:');
    console.error('   npx wrangler d1 execute flyx-admin-db --file=scripts/init-d1-admin.sql');
    process.exit(1);
  }

  // Get current D1 record counts
  console.log('\n📊 Current D1 record counts:');
  const d1Counts = {
    admin_users: await getD1RecordCount('admin_users'),
    feedback: await getD1RecordCount('feedback'),
    bot_detections: await getD1RecordCount('bot_detections'),
  };
  console.log(`   admin_users: ${d1Counts.admin_users}`);
  console.log(`   feedback: ${d1Counts.feedback}`);
  console.log(`   bot_detections: ${d1Counts.bot_detections}`);

  const stats: MigrationStats = {
    adminUsers: { migrated: 0, failed: 0, skipped: 0 },
    feedback: { migrated: 0, failed: 0, skipped: 0 },
    botDetections: { migrated: 0, failed: 0, skipped: 0 },
  };

  try {
    // Fetch data from Neon
    console.log('\n' + '━'.repeat(60));
    console.log('PHASE 1: Fetching data from Neon');
    console.log('━'.repeat(60));

    const adminUsers = await fetchFromNeon<AdminUser>(
      'admin_users',
      'SELECT id, username, password_hash, role, created_at, last_login FROM admin_users'
    );

    const feedbackItems = await fetchFromNeon<Feedback>(
      'feedback',
      'SELECT * FROM feedback ORDER BY created_at ASC'
    );

    const botDetections = await fetchFromNeon<BotDetection>(
      'bot_detections',
      'SELECT * FROM bot_detections ORDER BY created_at ASC'
    );

    // Migrate data to D1
    console.log('\n' + '━'.repeat(60));
    console.log('PHASE 2: Migrating data to D1');
    console.log('━'.repeat(60));

    stats.adminUsers = await migrateAdminUsers(adminUsers);
    stats.feedback = await migrateFeedback(feedbackItems);
    stats.botDetections = await migrateBotDetections(botDetections);

    // Print summary
    console.log('\n' + '━'.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('━'.repeat(60));
    
    console.log('\n📊 Admin Users:');
    console.log(`   ✅ Migrated: ${stats.adminUsers.migrated}`);
    console.log(`   ⏭️  Skipped:  ${stats.adminUsers.skipped}`);
    console.log(`   ❌ Failed:   ${stats.adminUsers.failed}`);

    console.log('\n📊 Feedback:');
    console.log(`   ✅ Migrated: ${stats.feedback.migrated}`);
    console.log(`   ⏭️  Skipped:  ${stats.feedback.skipped}`);
    console.log(`   ❌ Failed:   ${stats.feedback.failed}`);

    console.log('\n📊 Bot Detections:');
    console.log(`   ✅ Migrated: ${stats.botDetections.migrated}`);
    console.log(`   ⏭️  Skipped:  ${stats.botDetections.skipped}`);
    console.log(`   ❌ Failed:   ${stats.botDetections.failed}`);

    // Final D1 counts
    console.log('\n📊 Final D1 record counts:');
    const finalCounts = {
      admin_users: await getD1RecordCount('admin_users'),
      feedback: await getD1RecordCount('feedback'),
      bot_detections: await getD1RecordCount('bot_detections'),
    };
    console.log(`   admin_users: ${finalCounts.admin_users}`);
    console.log(`   feedback: ${finalCounts.feedback}`);
    console.log(`   bot_detections: ${finalCounts.bot_detections}`);

    const totalFailed = stats.adminUsers.failed + stats.feedback.failed + stats.botDetections.failed;
    
    console.log('\n' + '━'.repeat(60));
    if (totalFailed === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`⚠️  Migration completed with ${totalFailed} failures`);
    }
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
