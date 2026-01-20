/**
 * Test DLHD channels to identify which ones are failing
 * 
 * ⚠️ SECURITY WARNING ⚠️
 * This script contains CRITICAL security vulnerabilities and should NOT be used in production.
 * See DLHD_TEST_SECURITY_REVIEW.md for detailed analysis.
 * 
 * Issues:
 * - Hardcoded upstream domains (should use environment variables)
 * - No authentication/authorization
 * - No anti-leech protection
 * - Exposes internal infrastructure
 * 
 * For secure testing, use test-dlhd-channels-secure.js instead.
 */

const channels = require('./app/data/dlhd-channels.json');

// Test a sample of channels across different categories
const testChannels = [
  { id: '51', name: 'ABC USA' },
  { id: '325', name: 'ESPN' },
  { id: '326', name: 'ESPN 2' },
  { id: '200', name: 'CNN' },
  { id: '100', name: 'FOX Sports' },
  { id: '150', name: 'Sky Sports' },
  { id: '303', name: 'AMC USA' },
  { id: '304', name: 'Animal Planet' },
  { id: '123', name: 'Astro SuperSport 1' },
  { id: '134', name: 'Arena Sport 1 Premium' },
];

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function testChannel(channelId, channelName) {
  console.log(`\n=== Testing Channel ${channelId}: ${channelName} ===`);
  
  try {
    // Step 1: Fetch JWT
    const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channelId}`;
    const playerRes = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://daddyhd.com/',
      },
    });
    
    const html = await playerRes.text();
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    
    if (!jwtMatch) {
      console.log(`❌ FAIL: No JWT found`);
      return { id: channelId, name: channelName, status: 'NO_JWT', error: 'No JWT in player page' };
    }
    
    const jwt = jwtMatch[0];
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    const channelKey = payload.sub || `premium${channelId}`;
    
    console.log(`✓ JWT found, channelKey: ${channelKey}`);
    
    // Step 2: Server lookup
    const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
    const lookupRes = await fetch(lookupUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    let serverKey = 'zeko'; // fallback
    if (lookupRes.ok) {
      const lookupText = await lookupRes.text();
      if (lookupText.startsWith('{')) {
        const lookupData = JSON.parse(lookupText);
        serverKey = lookupData.server_key || 'zeko';
      }
    }
    
    console.log(`✓ Server key: ${serverKey}`);
    
    // Step 3: Fetch M3U8
    const m3u8Url = serverKey === 'top1/cdn' 
      ? `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`
      : `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
    
    console.log(`  M3U8 URL: ${m3u8Url}`);
    
    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    if (!m3u8Res.ok) {
      console.log(`❌ FAIL: M3U8 fetch failed - HTTP ${m3u8Res.status}`);
      return { id: channelId, name: channelName, status: 'M3U8_FAILED', error: `HTTP ${m3u8Res.status}`, serverKey };
    }
    
    const m3u8Content = await m3u8Res.text();
    
    if (!m3u8Content.includes('#EXTM3U') && !m3u8Content.includes('#EXT-X-')) {
      console.log(`❌ FAIL: Invalid M3U8 response`);
      console.log(`  Preview: ${m3u8Content.substring(0, 200)}`);
      return { id: channelId, name: channelName, status: 'INVALID_M3U8', error: 'Not a valid M3U8', serverKey, preview: m3u8Content.substring(0, 100) };
    }
    
    console.log(`✓ M3U8 fetched successfully (${m3u8Content.length} bytes)`);
    
    // Check if it has segments
    const hasSegments = m3u8Content.split('\n').some(line => line.trim() && !line.startsWith('#') && line.includes('.ts'));
    const hasKey = m3u8Content.includes('URI=');
    
    console.log(`  Has segments: ${hasSegments}`);
    console.log(`  Has encryption key: ${hasKey}`);
    
    if (!hasSegments) {
      console.log(`❌ FAIL: No segments in M3U8`);
      return { id: channelId, name: channelName, status: 'NO_SEGMENTS', error: 'M3U8 has no segments', serverKey };
    }
    
    console.log(`✅ SUCCESS`);
    return { id: channelId, name: channelName, status: 'SUCCESS', serverKey, hasKey };
    
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { id: channelId, name: channelName, status: 'ERROR', error: error.message };
  }
}

async function main() {
  console.log('Testing DLHD channels...\n');
  
  const results = [];
  
  for (const channel of testChannels) {
    const result = await testChannel(channel.id, channel.name);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
  
  console.log('\n\n=== SUMMARY ===\n');
  
  const successful = results.filter(r => r.status === 'SUCCESS');
  const failed = results.filter(r => r.status !== 'SUCCESS');
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\nFailed channels:');
    for (const result of failed) {
      console.log(`  ${result.id} (${result.name}): ${result.status} - ${result.error}`);
      if (result.serverKey) console.log(`    Server: ${result.serverKey}`);
    }
  }
  
  // Group by error type
  const errorTypes = {};
  for (const result of failed) {
    errorTypes[result.status] = (errorTypes[result.status] || 0) + 1;
  }
  
  if (Object.keys(errorTypes).length > 0) {
    console.log('\nError breakdown:');
    for (const [type, count] of Object.entries(errorTypes)) {
      console.log(`  ${type}: ${count}`);
    }
  }
}

main().catch(console.error);
