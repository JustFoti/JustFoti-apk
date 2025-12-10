#!/usr/bin/env node
/**
 * DLHD Stream Extraction Test Script
 * 
 * Tests the full authentication and stream extraction flow for DLHD.
 * 
 * Usage:
 *   node scripts/test-dlhd-extraction.js [channelId]
 *   node scripts/test-dlhd-extraction.js 51
 *   
 * With RPI proxy:
 *   RPI_PROXY_URL=http://your-rpi:3001 RPI_PROXY_KEY=secret node scripts/test-dlhd-extraction.js 51
 */

const PLAYER_DOMAINS = ['dlhd.dad', 'daddyhd.com', 'dlhd.so'];
const AUTH_URL = 'https://security.giokko.ru/auth2.php';

// RPI Proxy config (optional)
const RPI_PROXY_URL = process.env.RPI_PROXY_URL;
const RPI_PROXY_KEY = process.env.RPI_PROXY_KEY;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

/**
 * Parse authentication parameters from page HTML
 */
function parseAuthParams(html) {
  const patterns = {
    channelKey: /CHANNEL_KEY\s*=\s*["']([^"']+)["']/,
    token: /AUTH_TOKEN\s*=\s*["']([^"']+)["']/,
    country: /AUTH_COUNTRY\s*=\s*["']([^"']+)["']/,
    timestamp: /AUTH_TS\s*=\s*["']([^"']+)["']/,
    expiry: /AUTH_EXPIRY\s*=\s*["']([^"']+)["']/,
  };

  const params = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = html.match(pattern);
    params[key] = match ? match[1] : null;
  }

  return params;
}

/**
 * Fetch channel page and extract auth params
 */
async function fetchChannelPage(channelId) {
  log(`\n[1] Fetching channel page for channel ${channelId}...`, 'cyan');

  for (const domain of PLAYER_DOMAINS) {
    const url = `https://${domain}/embed/stream-${channelId}.php`;
    log(`  Trying: ${url}`, 'dim');

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Referer': `https://${domain}/`,
        },
      });

      if (!response.ok) {
        log(`  ✗ HTTP ${response.status}`, 'red');
        continue;
      }

      const html = await response.text();
      const params = parseAuthParams(html);

      if (params.channelKey && params.token) {
        log(`  ✓ Found auth params on ${domain}`, 'green');
        return { html, params, domain };
      } else {
        log(`  ✗ No auth params found in HTML`, 'yellow');
        // Save HTML for debugging
        if (html.length > 0) {
          const fs = require('fs');
          fs.writeFileSync(`dlhd-debug-${channelId}.html`, html);
          log(`    Saved HTML to dlhd-debug-${channelId}.html`, 'dim');
        }
      }
    } catch (err) {
      log(`  ✗ Error: ${err.message}`, 'red');
    }
  }

  throw new Error('Failed to fetch channel page from any domain');
}

/**
 * Authenticate with auth2.php
 */
async function authenticate(params) {
  log(`\n[2] Authenticating with auth2.php...`, 'cyan');
  log(`  Channel: ${params.channelKey}`, 'dim');
  log(`  Country: ${params.country}`, 'dim');
  log(`  Token: ${params.token?.substring(0, 16)}...`, 'dim');
  log(`  Timestamp: ${params.timestamp}`, 'dim');
  log(`  Expiry: ${params.expiry}`, 'dim');

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  const expiry = parseInt(params.expiry);
  if (expiry < now) {
    log(`  ⚠ Token expired ${now - expiry}s ago`, 'yellow');
  } else {
    log(`  Token valid for ${expiry - now}s`, 'dim');
  }

  const formData = new URLSearchParams();
  formData.append('channelKey', params.channelKey);
  formData.append('country', params.country);
  formData.append('timestamp', params.timestamp);
  formData.append('expiry', params.expiry);
  formData.append('token', params.token);

  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://dlhd.dad',
        'Referer': 'https://dlhd.dad/',
      },
      body: formData.toString(),
    });

    log(`  Response status: ${response.status}`, response.ok ? 'green' : 'red');

    const text = await response.text();
    log(`  Response: ${text.substring(0, 200)}`, 'dim');

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        log(`  ✓ Auth successful`, 'green');
        return data;
      } catch {
        log(`  ✓ Auth response (non-JSON): ${text}`, 'green');
        return { raw: text };
      }
    } else {
      log(`  ✗ Auth failed: HTTP ${response.status}`, 'red');
      return null;
    }
  } catch (err) {
    log(`  ✗ Auth error: ${err.message}`, 'red');
    return null;
  }
}

/**
 * Fetch via RPI proxy if configured
 */
async function fetchViaProxy(url) {
  if (!RPI_PROXY_URL || !RPI_PROXY_KEY) {
    return fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });
  }
  
  const proxyUrl = `${RPI_PROXY_URL}/proxy?url=${encodeURIComponent(url)}`;
  return fetch(proxyUrl, {
    headers: { 'X-API-Key': RPI_PROXY_KEY },
  });
}

/**
 * Get server key for channel
 */
async function getServerKey(channelKey, domain) {
  log(`\n[3] Getting server key...`, 'cyan');

  const url = `https://${domain}/server_lookup.js?channel_id=${channelKey}`;
  log(`  URL: ${url}`, 'dim');
  
  if (RPI_PROXY_URL) {
    log(`  Using RPI proxy: ${RPI_PROXY_URL}`, 'dim');
  }

  try {
    const response = await fetchViaProxy(url);

    if (!response.ok) {
      log(`  ✗ HTTP ${response.status}`, 'red');
      return null;
    }

    const text = await response.text();
    
    // Check if we got HTML (anti-bot challenge) instead of JSON
    if (text.startsWith('<') || text.includes('<!DOCTYPE')) {
      log(`  ✗ Got HTML challenge page instead of JSON`, 'yellow');
      log(`  Preview: ${text.substring(0, 100)}...`, 'dim');
      return null;
    }

    const data = JSON.parse(text);
    log(`  ✓ Server key: ${data.server_key}`, 'green');
    return data.server_key;
  } catch (err) {
    log(`  ✗ Error: ${err.message}`, 'red');
    return null;
  }
}

/**
 * Construct M3U8 URL
 */
function constructM3U8Url(serverKey, channelKey) {
  if (serverKey === 'top1/cdn') {
    return `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`;
  }
  return `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`;
}

/**
 * Test M3U8 fetch (will likely fail without residential IP)
 */
async function testM3U8Fetch(m3u8Url) {
  log(`\n[4] Testing M3U8 fetch...`, 'cyan');
  log(`  URL: ${m3u8Url}`, 'dim');
  
  if (RPI_PROXY_URL) {
    log(`  Using RPI proxy: ${RPI_PROXY_URL}`, 'dim');
  }

  try {
    const response = await fetchViaProxy(m3u8Url);

    log(`  Response status: ${response.status}`, response.ok ? 'green' : 'yellow');

    if (response.ok) {
      const content = await response.text();
      const isM3U8 = content.includes('#EXTM3U') || content.includes('#EXT-X-');
      
      if (isM3U8) {
        log(`  ✓ Valid M3U8 playlist (${content.length} bytes)`, 'green');
        
        // Parse key URL
        const keyMatch = content.match(/URI="([^"]+)"/);
        if (keyMatch) {
          log(`  Key URL: ${keyMatch[1]}`, 'dim');
        }
        
        // Count segments
        const segments = (content.match(/\.ts|\.css/g) || []).length;
        log(`  Segments: ${segments}`, 'dim');
        
        return { success: true, content };
      } else {
        log(`  ✗ Invalid M3U8 content`, 'red');
        log(`  Preview: ${content.substring(0, 200)}`, 'dim');
        return { success: false, content };
      }
    } else {
      const text = await response.text();
      log(`  ✗ Fetch failed - likely IP blocked`, 'yellow');
      log(`  Response: ${text.substring(0, 200)}`, 'dim');
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (err) {
    log(`  ✗ Error: ${err.message}`, 'red');
    return { success: false, error: err.message };
  }
}

/**
 * Main test function
 */
async function main() {
  const channelId = process.argv[2] || '51';
  const skipAuth = process.argv.includes('--skip-auth') || process.argv.includes('-s');
  
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('           DLHD Stream Extraction Test', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log(`Channel ID: ${channelId}`);
  
  if (RPI_PROXY_URL) {
    log(`RPI Proxy: ${RPI_PROXY_URL}`, 'dim');
  } else {
    log('RPI Proxy: Not configured (set RPI_PROXY_URL and RPI_PROXY_KEY)', 'yellow');
  }
  
  if (skipAuth) {
    log('Mode: Skip auth (direct M3U8 test)', 'dim');
  }

  try {
    // Skip auth mode - just test M3U8 directly
    if (skipAuth) {
      const channelKey = `premium${channelId}`;
      log(`\nChannel Key: ${channelKey}`);
      
      // Try known server keys
      const knownServerKeys = ['top1/cdn', 'top2', 'top3', 'cdn1', 'cdn2'];
      
      for (const serverKey of knownServerKeys) {
        const m3u8Url = constructM3U8Url(serverKey, channelKey);
        log(`\nTrying: ${serverKey}`, 'cyan');
        const result = await testM3U8Fetch(m3u8Url);
        
        if (result.success) {
          log(`\n✓ Working M3U8 found!`, 'green');
          log(`Server Key: ${serverKey}`);
          log(`M3U8 URL: ${m3u8Url}`);
          return;
        }
      }
      
      log('\n✗ No working server key found', 'red');
      process.exit(1);
    }
    
    // Full auth mode
    // Step 1: Fetch channel page
    const { params, domain } = await fetchChannelPage(channelId);
    
    if (!params.channelKey || !params.token) {
      log('\n✗ Failed to extract auth parameters', 'red');
      process.exit(1);
    }

    // Step 2: Authenticate
    const authResult = await authenticate(params);
    
    // Step 3: Get server key
    let serverKey = await getServerKey(params.channelKey, domain);
    
    if (!serverKey) {
      log('\n⚠ Server lookup failed, trying known server keys...', 'yellow');
      
      // Known server key patterns from analysis
      const knownServerKeys = ['top1/cdn', 'top2', 'top3', 'cdn1', 'cdn2'];
      
      for (const testKey of knownServerKeys) {
        log(`  Trying server key: ${testKey}`, 'dim');
        const testUrl = constructM3U8Url(testKey, params.channelKey);
        const testResult = await testM3U8Fetch(testUrl);
        
        if (testResult.success) {
          serverKey = testKey;
          log(`  ✓ Found working server key: ${testKey}`, 'green');
          break;
        }
      }
      
      if (!serverKey) {
        log('\n✗ No working server key found', 'red');
        process.exit(1);
      }
    }

    // Step 4: Construct and test M3U8 URL
    const m3u8Url = constructM3U8Url(serverKey, params.channelKey);
    log(`\nM3U8 URL: ${m3u8Url}`, 'cyan');
    
    const m3u8Result = await testM3U8Fetch(m3u8Url);

    // Summary
    log('\n═══════════════════════════════════════════════════════════', 'cyan');
    log('                      Summary', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log(`Channel Key: ${params.channelKey}`);
    log(`Server Key: ${serverKey}`);
    log(`M3U8 URL: ${m3u8Url}`);
    log(`Auth: ${authResult ? '✓' : '✗'}`, authResult ? 'green' : 'red');
    log(`M3U8 Fetch: ${m3u8Result.success ? '✓' : '✗ (needs residential IP)'}`, m3u8Result.success ? 'green' : 'yellow');

    if (!m3u8Result.success) {
      log('\nNote: M3U8 fetch requires residential IP (use RPI proxy)', 'yellow');
      log('The Cloudflare worker at /dlhd?channel=51 handles this.', 'dim');
    }

  } catch (err) {
    log(`\n✗ Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

main();
