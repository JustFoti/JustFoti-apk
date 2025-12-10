import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getDB, initializeDB } from '@/app/lib/db/neon-connection';
import { v4 as uuidv4 } from 'uuid';

// Initialize channel mappings table if it doesn't exist
async function ensureMappingsTables() {
  await initializeDB();
  const db = getDB();
  const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
  
  if (isNeon) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS channel_mappings (
        id TEXT PRIMARY KEY,
        our_channel_id TEXT NOT NULL,
        our_channel_name TEXT NOT NULL,
        stalker_account_id TEXT NOT NULL,
        stalker_channel_id TEXT NOT NULL,
        stalker_channel_name TEXT NOT NULL,
        stalker_channel_cmd TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        last_used BIGINT,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        created_at BIGINT,
        updated_at BIGINT
      )
    `);
  } else {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS channel_mappings (
        id TEXT PRIMARY KEY,
        our_channel_id TEXT NOT NULL,
        our_channel_name TEXT NOT NULL,
        stalker_account_id TEXT NOT NULL,
        stalker_channel_id TEXT NOT NULL,
        stalker_channel_name TEXT NOT NULL,
        stalker_channel_cmd TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        last_used INTEGER,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT(strftime('%s', 'now')),
        updated_at INTEGER DEFAULT(strftime('%s', 'now'))
      )
    `);
  }
  
  // Create indexes
  await db.execute('CREATE INDEX IF NOT EXISTS idx_channel_mappings_our_channel ON channel_mappings(our_channel_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_channel_mappings_account ON channel_mappings(stalker_account_id)');
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureMappingsTables();
    const db = await getDB();
    
    const searchParams = request.nextUrl.searchParams;
    const ourChannelId = searchParams.get('ourChannelId');
    const accountId = searchParams.get('accountId');
    
    let query = `
      SELECT m.*, a.portal_url, a.mac_address, a.name as account_name, a.status as account_status
      FROM channel_mappings m
      LEFT JOIN iptv_accounts a ON m.stalker_account_id = a.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];
    const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
    let paramIndex = 1;
    
    if (ourChannelId) {
      conditions.push(`m.our_channel_id = ${isNeon ? `$${paramIndex}` : '?'}`);
      params.push(ourChannelId);
      paramIndex++;
    }
    
    if (accountId) {
      conditions.push(`m.stalker_account_id = ${isNeon ? `$${paramIndex}` : '?'}`);
      params.push(accountId);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY m.our_channel_name ASC, m.priority DESC';
    
    const mappings = await db.query(query, params);
    
    return NextResponse.json({ 
      success: true, 
      mappings,
      total: mappings.length 
    });
  } catch (error: any) {
    console.error('Failed to fetch channel mappings:', error);
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
    await ensureMappingsTables();
    const db = await getDB();
    const body = await request.json();
    const { action } = body;
    const isNeon = process.env.DATABASE_URL?.includes('neon.tech');

    switch (action) {
      case 'add': {
        const { 
          our_channel_id, 
          our_channel_name, 
          stalker_account_id, 
          stalker_channel_id, 
          stalker_channel_name, 
          stalker_channel_cmd,
          priority 
        } = body;
        
        if (!our_channel_id || !stalker_account_id || !stalker_channel_id || !stalker_channel_cmd) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const id = uuidv4();
        const now = Date.now();

        if (isNeon) {
          await db.execute(`
            INSERT INTO channel_mappings 
            (id, our_channel_id, our_channel_name, stalker_account_id, stalker_channel_id, stalker_channel_name, stalker_channel_cmd, priority, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [id, our_channel_id, our_channel_name || '', stalker_account_id, stalker_channel_id, stalker_channel_name || '', stalker_channel_cmd, priority || 0, now, now]);
        } else {
          await db.execute(`
            INSERT INTO channel_mappings 
            (id, our_channel_id, our_channel_name, stalker_account_id, stalker_channel_id, stalker_channel_name, stalker_channel_cmd, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [id, our_channel_id, our_channel_name || '', stalker_account_id, stalker_channel_id, stalker_channel_name || '', stalker_channel_cmd, priority || 0, now, now]);
        }

        return NextResponse.json({ success: true, id });
      }

      case 'update': {
        const { id, ...updates } = body;
        
        if (!id) {
          return NextResponse.json({ error: 'Mapping ID required' }, { status: 400 });
        }

        const allowedFields = ['priority', 'is_active', 'stalker_channel_cmd'];
        const setClause: string[] = [];
        const values: any[] = [];
        
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
          `UPDATE channel_mappings SET ${setClause.join(', ')} WHERE id = ${isNeon ? `$${paramIndex}` : '?'}`,
          values
        );

        return NextResponse.json({ success: true });
      }

      case 'delete': {
        const { id } = body;
        
        if (!id) {
          return NextResponse.json({ error: 'Mapping ID required' }, { status: 400 });
        }

        await db.execute(
          `DELETE FROM channel_mappings WHERE id = ${isNeon ? '$1' : '?'}`,
          [id]
        );

        return NextResponse.json({ success: true });
      }

      case 'bulk_delete': {
        const { ids } = body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        const placeholders = isNeon 
          ? ids.map((_, i) => `$${i + 1}`).join(', ')
          : ids.map(() => '?').join(', ');
          
        await db.execute(
          `DELETE FROM channel_mappings WHERE id IN (${placeholders})`,
          ids
        );

        return NextResponse.json({ success: true, deleted: ids.length });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Channel mappings error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
