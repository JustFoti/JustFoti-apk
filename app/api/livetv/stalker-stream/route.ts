/**
 * Stalker Stream API
 * 
 * Selects the best available IPTV Stalker account for a channel based on:
 * - Account availability (not at stream limit)
 * - Priority settings
 * - Recent usage (load balancing)
 * - Success/failure rates
 * 
 * Returns a stream URL from the selected account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDB, initializeDB } from '@/app/lib/db/neon-connection';

const RPI_PROXY_URL = process.env.RPI_PROXY_URL;
const RPI_PROXY_KEY = process.env.RPI_PROXY_KEY;
const REQUEST_TIMEOUT = 15000;

// STB Device Headers
const STB_USER_AGENT = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

function buildHeaders(macAddress: string, token?: string): Record<string, string> {
  const encodedMac = encodeURIComponent(macAddress);
  const headers: Record<string, string> = {
    'User-Agent': STB_USER_AGENT,
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Cookie': `mac=${encodedMac}; stb_lang=en; timezone=GMT`,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

function normalizePortalUrl(portalUrl: string): string {
  let url = portalUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/c')) url = url.slice(0, -2);
  else if (url.endsWith('/portal.php')) url = url.slice(0, -11);
  return url;
}

function parseSecureJson(text: string): any {
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function extractUrlFromCmd(cmd: string): string {
  let url = cmd;
  const prefixes = ['ffmpeg ', 'ffrt ', 'ffrt2 ', 'ffrt3 ', 'ffrt4 '];
  for (const prefix of prefixes) {
    if (url.startsWith(prefix)) {
      url = url.substring(prefix.length);
      break;
    }
  }
  return url.trim();
}

async function performHandshake(portalUrl: string, macAddress: string): Promise<string> {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'stb');
  url.searchParams.set('action', 'handshake');
  url.searchParams.set('token', '');
  url.searchParams.set('JsHttpRequest', '1-xml');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url.toString(), { 
      signal: controller.signal,
      headers: buildHeaders(macAddress),
    });
    clearTimeout(timeoutId);
    
    const text = await response.text();
    const data = parseSecureJson(text);
    
    if (data?.js?.token) {
      return data.js.token;
    }
    throw new Error('No token received');
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function getStreamUrl(
  portalUrl: string, 
  macAddress: string, 
  token: string, 
  cmd: string
): Promise<string | null> {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'itv');
  url.searchParams.set('action', 'create_link');
  url.searchParams.set('cmd', cmd);
  url.searchParams.set('series', '');
  url.searchParams.set('forced_storage', 'undefined');
  url.searchParams.set('disable_ad', '0');
  url.searchParams.set('download', '0');
  url.searchParams.set('JsHttpRequest', '1-xml');

  const requestUrl = url.toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    let response: Response;
    
    // Use RPi proxy if available for residential IP
    if (RPI_PROXY_URL && RPI_PROXY_KEY) {
      const rpiParams = new URLSearchParams({
        url: requestUrl,
        mac: macAddress,
        token: token,
        key: RPI_PROXY_KEY,
      });
      
      response = await fetch(`${RPI_PROXY_URL}/iptv/api?${rpiParams.toString()}`, {
        signal: controller.signal,
      });
    } else {
      response = await fetch(requestUrl, { 
        signal: controller.signal,
        headers: buildHeaders(macAddress, token),
      });
    }
    clearTimeout(timeoutId);
    
    const text = await response.text();
    const data = parseSecureJson(text);
    
    let streamUrl = data?.js?.cmd || null;
    if (streamUrl) {
      streamUrl = extractUrlFromCmd(streamUrl);
    }
    
    // If returned URL has empty stream param, use original cmd URL
    if (streamUrl && streamUrl.includes('stream=&')) {
      streamUrl = extractUrlFromCmd(cmd);
    }
    
    return streamUrl;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const checkOnly = searchParams.get('check') === 'true';
    
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    const db = await getDB();
    const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
    
    // If just checking for mapping existence
    if (checkOnly) {
      const mappings = await db.query(`
        SELECT COUNT(*) as count
        FROM channel_mappings m
        JOIN iptv_accounts a ON m.stalker_account_id = a.id
        WHERE m.our_channel_id = ${isNeon ? '$1' : '?'}
          AND m.is_active = ${isNeon ? 'TRUE' : '1'}
          AND a.status = 'active'
      `, [channelId]);
      
      const count = parseInt(mappings[0]?.count || '0');
      return NextResponse.json({ 
        success: true, 
        hasMapping: count > 0,
        mappingCount: count 
      });
    }
    
    // Find all active mappings for this channel, joined with account info
    // Order by: account priority, mapping priority, least recently used, best success rate
    const mappings = await db.query(`
      SELECT 
        m.*,
        a.portal_url,
        a.mac_address,
        a.stream_limit,
        a.active_streams,
        a.status as account_status,
        a.priority as account_priority
      FROM channel_mappings m
      JOIN iptv_accounts a ON m.stalker_account_id = a.id
      WHERE m.our_channel_id = ${isNeon ? '$1' : '?'}
        AND m.is_active = ${isNeon ? 'TRUE' : '1'}
        AND a.status = 'active'
        AND a.active_streams < a.stream_limit
      ORDER BY 
        a.priority DESC,
        m.priority DESC,
        m.last_used ASC NULLS FIRST,
        (m.success_count * 1.0 / NULLIF(m.success_count + m.failure_count, 0)) DESC NULLS LAST
    `, [channelId]);

    if (mappings.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No available mappings for this channel',
        channelId 
      }, { status: 404 });
    }

    // Try each mapping until one works
    for (const mapping of mappings) {
      try {
        const portalUrl = normalizePortalUrl(mapping.portal_url);
        
        // Perform handshake
        const token = await performHandshake(portalUrl, mapping.mac_address);
        
        // Get stream URL
        const streamUrl = await getStreamUrl(
          portalUrl, 
          mapping.mac_address, 
          token, 
          mapping.stalker_channel_cmd
        );
        
        if (streamUrl) {
          const now = Date.now();
          
          // Update mapping stats
          await db.execute(
            `UPDATE channel_mappings SET 
              last_used = ${isNeon ? '$1' : '?'}, 
              success_count = success_count + 1,
              updated_at = ${isNeon ? '$2' : '?'}
            WHERE id = ${isNeon ? '$3' : '?'}`,
            [now, now, mapping.id]
          );
          
          // Update account usage
          await db.execute(
            `UPDATE iptv_accounts SET 
              last_used = ${isNeon ? '$1' : '?'}, 
              total_usage_count = total_usage_count + 1,
              updated_at = ${isNeon ? '$2' : '?'}
            WHERE id = ${isNeon ? '$3' : '?'}`,
            [now, now, mapping.stalker_account_id]
          );
          
          // Build proxied stream URL
          let proxiedUrl: string;
          if (RPI_PROXY_URL && RPI_PROXY_KEY) {
            const proxyParams = new URLSearchParams({
              url: streamUrl,
              mac: mapping.mac_address,
              key: RPI_PROXY_KEY,
            });
            proxiedUrl = `${RPI_PROXY_URL}/iptv/stream?${proxyParams.toString()}`;
          } else {
            // Fallback to direct URL (may not work due to IP binding)
            proxiedUrl = streamUrl;
          }
          
          return NextResponse.json({
            success: true,
            streamUrl: proxiedUrl,
            rawStreamUrl: streamUrl,
            account: {
              id: mapping.stalker_account_id,
              portal: mapping.portal_url,
            },
            mapping: {
              id: mapping.id,
              stalkerChannelName: mapping.stalker_channel_name,
            }
          });
        }
      } catch (error: any) {
        console.error(`Failed to get stream from mapping ${mapping.id}:`, error.message);
        
        // Update failure count
        const now = Date.now();
        await db.execute(
          `UPDATE channel_mappings SET 
            failure_count = failure_count + 1,
            updated_at = ${isNeon ? '$1' : '?'}
          WHERE id = ${isNeon ? '$2' : '?'}`,
          [now, mapping.id]
        );
        
        // Continue to next mapping
        continue;
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'All available mappings failed',
      triedMappings: mappings.length 
    }, { status: 503 });

  } catch (error: any) {
    console.error('Stalker stream error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
