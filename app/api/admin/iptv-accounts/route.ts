import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getDB } from '@/app/lib/db/connection';
import { v4 as uuidv4 } from 'uuid';

// Initialize IPTV tables if they don't exist
async function ensureIPTVTables() {
  const db = await getDB();
  const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
  
  if (isNeon) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS iptv_accounts (
        id TEXT PRIMARY KEY,
        portal_url TEXT NOT NULL,
        mac_address TEXT NOT NULL,
        name TEXT,
        channels_count INTEGER DEFAULT 0,
        stream_limit INTEGER DEFAULT 1,
        active_streams INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        last_tested BIGINT,
        last_used BIGINT,
        total_usage_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_error TEXT,
        priority INTEGER DEFAULT 0,
        created_at BIGINT,
        updated_at BIGINT,
        UNIQUE(portal_url, mac_address)
      )
    `);
  } else {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS iptv_accounts (
        id TEXT PRIMARY KEY,
        portal_url TEXT NOT NULL,
        mac_address TEXT NOT NULL,
        name TEXT,
        channels_count INTEGER DEFAULT 0,
        stream_limit INTEGER DEFAULT 1,
        active_streams INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        last_tested INTEGER,
        last_used INTEGER,
        total_usage_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_error TEXT,
        priority INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT(strftime('%s', 'now')),
        updated_at INTEGER DEFAULT(strftime('%s', 'now')),
        UNIQUE(portal_url, mac_address)
      )
    `);
  }
  
  // Create indexes
  await db.execute('CREATE INDEX IF NOT EXISTS idx_iptv_accounts_status ON iptv_accounts(status)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_iptv_accounts_priority ON iptv_accounts(priority DESC)');
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureIPTVTables();
    const db = await getDB();
    
    const accounts = await db.query(`
      SELECT * FROM iptv_accounts 
      ORDER BY priority DESC, channels_count DESC, created_at DESC
    `);
    
    return NextResponse.json({ 
      success: true, 
      accounts,
      total: accounts.length 
    });
  } catch (error: any) {
    console.error('Failed to fetch IPTV accounts:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureIPTVTables();
    const db = await getDB();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'add': {
        const { portal_url, mac_address, name, channels_count, stream_limit, priority } = body;
        
        if (!portal_url || !mac_address) {
          return NextResponse.json({ error: 'Portal URL and MAC address required' }, { status: 400 });
        }

        const id = uuidv4();
        const now = Date.now();
        const isNeon = process.env.DATABASE_URL?.includes('neon.tech');

        if (isNeon) {
          await db.execute(`
            INSERT INTO iptv_accounts (id, portal_url, mac_address, name, channels_count, stream_limit, priority, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (portal_url, mac_address) DO UPDATE SET
              name = EXCLUDED.name,
              channels_count = EXCLUDED.channels_count,
              stream_limit = EXCLUDED.stream_limit,
              priority = EXCLUDED.priority,
              updated_at = EXCLUDED.updated_at
          `, [id, portal_url, mac_address, name || null, channels_count || 0, stream_limit || 1, priority || 0, now, now]);
        } else {
          await db.execute(`
            INSERT OR REPLACE INTO iptv_accounts (id, portal_url, mac_address, name, channels_count, stream_limit, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [id, portal_url, mac_address, name || null, channels_count || 0, stream_limit || 1, priority || 0, now, now]);
        }

        return NextResponse.json({ success: true, id });
      }

      case 'import': {
        const { accounts } = body;
        
        if (!Array.isArray(accounts) || accounts.length === 0) {
          return NextResponse.json({ error: 'No accounts to import' }, { status: 400 });
        }

        const now = Date.now();
        const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
        let imported = 0;

        for (const acc of accounts) {
          if (!acc.portal_url || !acc.mac_address) continue;
          
          const id = uuidv4();
          try {
            if (isNeon) {
              await db.execute(`
                INSERT INTO iptv_accounts (id, portal_url, mac_address, name, channels_count, stream_limit, priority, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (portal_url, mac_address) DO UPDATE SET
                  channels_count = EXCLUDED.channels_count,
                  updated_at = EXCLUDED.updated_at
              `, [id, acc.portal_url, acc.mac_address, acc.name || null, acc.channels_count || 0, acc.stream_limit || 1, acc.priority || 0, now, now]);
            } else {
              await db.execute(`
                INSERT OR IGNORE INTO iptv_accounts (id, portal_url, mac_address, name, channels_count, stream_limit, priority, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [id, acc.portal_url, acc.mac_address, acc.name || null, acc.channels_count || 0, acc.stream_limit || 1, acc.priority || 0, now, now]);
            }
            imported++;
          } catch (e) {
            // Skip duplicates
          }
        }

        return NextResponse.json({ success: true, imported });
      }

      case 'update': {
        const { id, ...updates } = body;
        
        if (!id) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        const allowedFields = ['name', 'stream_limit', 'priority', 'status', 'channels_count'];
        const setClause: string[] = [];
        const values: any[] = [];
        const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
        
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields.includes(key)) {
            setClause.push(`${key} = ${isNeon ? `$${paramIndex}` : '?'}`);
            values.push(value);
            paramIndex++;
          }
        }

        if (setClause.length === 0) {
          return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        setClause.push(`updated_at = ${isNeon ? `$${paramIndex}` : '?'}`);
        values.push(Date.now());
        paramIndex++;
        
        values.push(id);

        await db.execute(
          `UPDATE iptv_accounts SET ${setClause.join(', ')} WHERE id = ${isNeon ? `$${paramIndex}` : '?'}`,
          values
        );

        return NextResponse.json({ success: true });
      }

      case 'delete': {
        const { id } = body;
        
        if (!id) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
        await db.execute(
          `DELETE FROM iptv_accounts WHERE id = ${isNeon ? '$1' : '?'}`,
          [id]
        );

        return NextResponse.json({ success: true });
      }

      case 'test': {
        // Test connection to a specific account
        const { id, portal_url, mac_address } = body;
        
        // Use the existing IPTV debug endpoint logic
        const testResponse = await fetch(`${request.nextUrl.origin}/api/admin/iptv-debug`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({ action: 'test', portalUrl: portal_url, macAddress: mac_address })
        });
        
        const testResult = await testResponse.json();
        const now = Date.now();
        const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
        
        // Update account status based on test result
        if (id) {
          if (testResult.success) {
            await db.execute(
              `UPDATE iptv_accounts SET 
                status = 'active', 
                channels_count = ${isNeon ? '$1' : '?'}, 
                last_tested = ${isNeon ? '$2' : '?'}, 
                last_error = NULL,
                error_count = 0,
                updated_at = ${isNeon ? '$3' : '?'}
              WHERE id = ${isNeon ? '$4' : '?'}`,
              [testResult.content?.itv || 0, now, now, id]
            );
          } else {
            await db.execute(
              `UPDATE iptv_accounts SET 
                status = 'error', 
                last_tested = ${isNeon ? '$1' : '?'}, 
                last_error = ${isNeon ? '$2' : '?'},
                error_count = error_count + 1,
                updated_at = ${isNeon ? '$3' : '?'}
              WHERE id = ${isNeon ? '$4' : '?'}`,
              [now, testResult.error || 'Connection failed', now, id]
            );
          }
        }

        return NextResponse.json({ 
          success: testResult.success, 
          channels: testResult.content?.itv || 0,
          error: testResult.error 
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('IPTV accounts error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
