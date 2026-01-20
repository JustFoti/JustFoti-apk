/**
 * Test the specific failing channels
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function testChannel(channelId) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing Channel ${channelId}`);
  console.log('='.repeat(80));
  
  try {
    // Step 1: Fetch JWT
    console.log('\n[1/4] Fetching JWT...');
    const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channelId}`;
    const playerRes = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://daddyhd.com/',
      },
    });
    
    if (!playerRes.ok) {
      console.log(`❌ Player page failed: HTTP ${playerRes.status}`);
      return;
    }
    
    const html = await playerRes.text();
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    
    if (!jwtMatch) {
      console.log(`❌ No JWT found in player page`);
      console.log(`Page preview: ${html.substring(0, 500)}`);
      return;
    }
    
    const jwt = jwtMatch[0];
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    const channelKey = payload.sub || `premium${channelId}`;
    
    console.log(`✓ JWT found`);
    console.log(`  Channel key: ${channelKey}`);
    console.log(`  Country: ${payload.country || 'unknown'}`);
    console.log(`  Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    
    // Step 2: Server lookup
    console.log('\n[2/4] Looking up server key...');
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
      console.log(`  Lookup response: ${lookupText}`);
      if (lookupText.startsWith('{')) {
        const lookupData = JSON.parse(lookupText);
        serverKey = lookupData.server_key || 'zeko';
      }
    } else {
      console.log(`⚠ Server lookup failed: HTTP ${lookupRes.status}, using fallback`);
    }
    
    console.log(`✓ Server key: ${serverKey}`);
    
    // Step 3: Fetch M3U8
    console.log('\n[3/4] Fetching M3U8 playlist...');
    const m3u8Url = serverKey === 'top1/cdn' 
      ? `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`
      : `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
    
    console.log(`  URL: ${m3u8Url}`);
    
    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    console.log(`  Status: ${m3u8Res.status}`);
    
    if (!m3u8Res.ok) {
      console.log(`❌ M3U8 fetch failed: HTTP ${m3u8Res.status}`);
      const errorText = await m3u8Res.text();
      console.log(`  Error: ${errorText.substring(0, 200)}`);
      return;
    }
    
    const m3u8Content = await m3u8Res.text();
    console.log(`✓ M3U8 fetched (${m3u8Content.length} bytes)`);
    
    // Check content
    const isValid = m3u8Content.includes('#EXTM3U') || m3u8Content.includes('#EXT-X-');
    console.log(`  Valid M3U8: ${isValid}`);
    
    if (!isValid) {
      console.log(`❌ Invalid M3U8 content:`);
      console.log(m3u8Content.substring(0, 500));
      return;
    }
    
    // Parse segments
    const lines = m3u8Content.split('\n');
    let segmentCount = 0;
    let currentUrl = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        if (currentUrl) {
          segmentCount++;
          currentUrl = '';
        }
        continue;
      }
      
      if (trimmed.startsWith('http')) {
        if (currentUrl) segmentCount++;
        currentUrl = trimmed;
      } else {
        currentUrl += trimmed;
      }
    }
    if (currentUrl) segmentCount++;
    
    console.log(`  Segments found: ${segmentCount}`);
    
    const hasKey = m3u8Content.includes('URI=');
    console.log(`  Has encryption key: ${hasKey}`);
    
    if (segmentCount === 0) {
      console.log(`❌ No segments in playlist!`);
      console.log('\nM3U8 content:');
      console.log(m3u8Content);
      return;
    }
    
    // Step 4: Test first segment
    console.log('\n[4/4] Testing first segment...');
    
    // Extract first segment URL
    currentUrl = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.startsWith('http')) {
        currentUrl = trimmed;
      } else {
        currentUrl += trimmed;
      }
      
      if (currentUrl && (currentUrl.length > 100 || !lines[lines.indexOf(line) + 1]?.trim() || lines[lines.indexOf(line) + 1]?.startsWith('#'))) {
        break;
      }
    }
    
    if (!currentUrl) {
      console.log(`❌ Could not extract segment URL`);
      return;
    }
    
    console.log(`  URL: ${currentUrl.substring(0, 100)}...`);
    
    const segmentRes = await fetch(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    console.log(`  Status: ${segmentRes.status}`);
    
    if (!segmentRes.ok) {
      console.log(`❌ Segment fetch failed`);
      const errorText = await segmentRes.text();
      console.log(`  Error: ${errorText.substring(0, 200)}`);
      return;
    }
    
    const segmentData = await segmentRes.arrayBuffer();
    console.log(`✓ Segment fetched (${segmentData.byteLength} bytes)`);
    
    console.log(`\n✅ Channel ${channelId} is WORKING`);
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log(error.stack);
  }
}

async function main() {
  // Test the failing channels
  await testChannel('539');
  await new Promise(r => setTimeout(r, 2000));
  await testChannel('20');
}

main().catch(console.error);
