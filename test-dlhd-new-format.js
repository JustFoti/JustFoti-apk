/**
 * Test DLHD new segment format (January 2026)
 * Segments are now split across multiple lines and don't end in .ts
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function testChannel(channelId) {
  console.log(`\n=== Testing Channel ${channelId} ===\n`);
  
  // Step 1: Get JWT
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
    console.log('❌ No JWT found');
    return;
  }
  
  const jwt = jwtMatch[0];
  const payload = JSON.parse(
    Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  );
  const channelKey = payload.sub || `premium${channelId}`;
  
  console.log(`✓ JWT obtained`);
  console.log(`✓ Channel key: ${channelKey}`);
  
  // Step 2: Get server key
  const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
  const lookupRes = await fetch(lookupUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
    },
  });
  
  let serverKey = 'zeko';
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
  
  console.log(`✓ M3U8 URL: ${m3u8Url}`);
  
  const m3u8Res = await fetch(m3u8Url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
    },
  });
  
  if (!m3u8Res.ok) {
    console.log(`❌ M3U8 fetch failed: ${m3u8Res.status}`);
    return;
  }
  
  const m3u8Content = await m3u8Res.text();
  console.log(`✓ M3U8 fetched (${m3u8Content.length} bytes)\n`);
  
  // Analyze the M3U8 format
  console.log('=== M3U8 Analysis ===\n');
  
  const lines = m3u8Content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  // Find segment URLs (lines that start with https:// and contain dvalna.ru)
  const segmentLines = [];
  let currentUrl = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // If line starts with https://, it's a new URL
    if (line.startsWith('https://')) {
      if (currentUrl) {
        segmentLines.push({ lineNum: i - 1, url: currentUrl });
      }
      currentUrl = line;
    }
    // If line doesn't start with # and we have a current URL, it's a continuation
    else if (currentUrl && line && !line.startsWith('#')) {
      currentUrl += line;
    }
    // If line starts with # or is empty, flush current URL
    else if (line.startsWith('#') || !line) {
      if (currentUrl) {
        segmentLines.push({ lineNum: i - 1, url: currentUrl });
        currentUrl = '';
      }
    }
  }
  
  // Don't forget the last URL
  if (currentUrl) {
    segmentLines.push({ lineNum: lines.length - 1, url: currentUrl });
  }
  
  console.log(`\nSegment URLs found: ${segmentLines.length}`);
  
  if (segmentLines.length > 0) {
    console.log(`\nFirst segment URL:`);
    console.log(`  Line: ${segmentLines[0].lineNum}`);
    console.log(`  URL: ${segmentLines[0].url}`);
    console.log(`  Length: ${segmentLines[0].url.length} chars`);
    console.log(`  Ends with .ts: ${segmentLines[0].url.endsWith('.ts')}`);
    console.log(`  Contains dvalna.ru: ${segmentLines[0].url.includes('dvalna.ru')}`);
    
    // Check if URL is split across lines in the original
    const firstSegmentStart = m3u8Content.indexOf(segmentLines[0].url.substring(0, 50));
    const firstSegmentFull = m3u8Content.substring(firstSegmentStart, firstSegmentStart + segmentLines[0].url.length + 100);
    console.log(`\n  Raw format in M3U8:`);
    console.log(`  ${firstSegmentFull.split('\n').slice(0, 3).join('\n  ')}`);
    
    console.log(`\nLast segment URL:`);
    const lastSeg = segmentLines[segmentLines.length - 1];
    console.log(`  Line: ${lastSeg.lineNum}`);
    console.log(`  URL: ${lastSeg.url}`);
    console.log(`  Length: ${lastSeg.url.length} chars`);
  }
  
  // Check for key URL
  const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
  if (keyMatch) {
    console.log(`\n✓ Encryption key URL found:`);
    console.log(`  ${keyMatch[1]}`);
    
    // Check if key URL is also split
    const keyInContent = m3u8Content.substring(
      m3u8Content.indexOf('URI="'),
      m3u8Content.indexOf('URI="') + 200
    );
    console.log(`\n  Raw format in M3U8:`);
    console.log(`  ${keyInContent.split('\n').slice(0, 3).join('\n  ')}`);
  }
  
  // Test if we can fetch a segment
  if (segmentLines.length > 0) {
    console.log(`\n=== Testing Segment Fetch ===\n`);
    const testSegmentUrl = segmentLines[0].url;
    
    try {
      const segRes = await fetch(testSegmentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': `https://${PLAYER_DOMAIN}`,
          'Referer': `https://${PLAYER_DOMAIN}/`,
        },
      });
      
      console.log(`Segment fetch status: ${segRes.status}`);
      console.log(`Content-Type: ${segRes.headers.get('content-type')}`);
      console.log(`Content-Length: ${segRes.headers.get('content-length')}`);
      
      if (segRes.ok) {
        const segData = await segRes.arrayBuffer();
        const firstBytes = new Uint8Array(segData.slice(0, 16));
        console.log(`First 16 bytes: ${Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        console.log(`Size: ${segData.byteLength} bytes`);
        
        // Check if it's encrypted (won't start with 0x47 MPEG-TS sync byte)
        if (firstBytes[0] === 0x47) {
          console.log(`✓ Appears to be unencrypted MPEG-TS`);
        } else {
          console.log(`✓ Appears to be encrypted (not MPEG-TS sync byte)`);
        }
      }
    } catch (error) {
      console.log(`❌ Segment fetch failed: ${error.message}`);
    }
  }
}

// Test a single channel
testChannel('51').catch(console.error);
