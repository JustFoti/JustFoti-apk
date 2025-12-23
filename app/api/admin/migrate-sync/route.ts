/**
 * Admin API: Migrate Sync Data from Neon to D1
 * 
 * GET  - Fetch sync accounts from Neon (preview)
 * POST - Migrate accounts to D1
 */

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'flyx-admin-jwt-secret-key-2024';
const CF_SYNC_URL = process.env.NEXT_PUBLIC_CF_SYNC_URL || 'https://flyx-sync.vynx.workers.dev';

interface SyncAccount {
  id: string;
  code_hash: string;
  sync_data: any;
  created_at: number;
  updated_at: number;
  last_sync_at: number;
  device_count: number;
}

// Verify admin auth
async function verifyAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;
    
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

// GET - Preview Neon sync data
export async function GET() {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = neon(DATABASE_URL);
    
    // Check if table exists and get count
    const accounts = await sql`SELECT * FROM sync_accounts ORDER BY last_sync_at DESC`;
    
    return NextResponse.json({
      success: true,
      count: accounts.length,
      accounts: accounts.map((a) => ({
        id: a.id as string,
        codeHashPreview: (a.code_hash as string).substring(0, 12) + '...',
        lastSyncAt: a.last_sync_at as number,
        createdAt: a.created_at as number,
        deviceCount: (a.device_count as number) || 1,
        dataSize: JSON.stringify(a.sync_data).length,
      })),
      cfSyncUrl: CF_SYNC_URL,
    });
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({
        success: true,
        count: 0,
        accounts: [],
        message: 'No sync_accounts table in Neon',
      });
    }
    console.error('[Migrate] Error fetching from Neon:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Migrate to D1
export async function POST() {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = neon(DATABASE_URL);
    const accounts = await sql`SELECT * FROM sync_accounts`;

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        migrated: 0,
        message: 'No accounts to migrate',
      });
    }

    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const account of accounts as SyncAccount[]) {
      try {
        // Push to D1 via the sync worker's internal endpoint
        const syncDataStr = typeof account.sync_data === 'string'
          ? account.sync_data
          : JSON.stringify(account.sync_data);

        const response = await fetch(`${CF_SYNC_URL}/admin/migrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: account.id,
            code_hash: account.code_hash,
            sync_data: syncDataStr,
            created_at: account.created_at,
            updated_at: account.updated_at,
            last_sync_at: account.last_sync_at,
            device_count: account.device_count || 1,
          }),
        });

        if (response.ok) {
          migrated++;
        } else {
          const err = await response.text();
          failed++;
          errors.push(`${account.id.substring(0, 15)}: ${err}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`${account.id.substring(0, 15)}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: accounts.length,
      migrated,
      failed,
      errors: errors.slice(0, 10), // Limit error messages
    });
  } catch (error: any) {
    console.error('[Migrate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
