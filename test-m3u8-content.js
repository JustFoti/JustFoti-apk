/**
 * Check what's actually in the M3U8 files
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function checkM3U8(channelId, channelName) {
  console.log(`\n=== Channel ${channelId}: ${channelName} ===`);
  
  try {
    // Get JWT
    const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channelId}`;
    const playerRes = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://daddyhd.com/',
      },
    });
    
    const html = await playerRes.text();
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    const jwt = jwtMatch[0];
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    const channelKey = payload.sub || `premium${channelId}`;
    
    // Get server key
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
    
    // Fetch M3U8
    const m3u8Url = serverKey === 'top1/cdn' 
      ? `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`
      : `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
    
    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    const m3u8Content = await m3u8Res.text();
    
    console.log('M3U8 Content:');
    console.log('─'.repeat(80));
    console.log(m3u8Content);
    console.log('─'.repeat(80));
    
    // Check if it's a master playlist
    const isMaster = m3u8Content.includes('#EXT-X-STREAM-INF');
    const hasSegments = m3u8Content.split('\n').some(line => line.trim() && !line.startsWith('#') && line.includes('.ts'));
    const hasVariants = m3u8Content.split('\n').some(line => line.trim() && !line.startsWith('#') && line.includes('.m3u8'));
    
    console.log(`\nAnalysis:`);
    console.log(`  Is master playlist: ${isMaster}`);
    console.log(`  Has .ts segments: ${hasSegments}`);
    console.log(`  Has .m3u8 variants: ${hasVariants}`);
    
    if (hasVariants) {
      const variants = m3u8Content.split('\n').filter(line => line.trim() && !line.startsWith('#') && line.includes('.m3u8'));
      console.log(`\n  Variant playlists found:`);
      for (const variant of variants) {
        console.log(`    ${variant.trim()}`);
      }
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

async function main() {
  // Test just one channel to see the structure
  await checkM3U8('51', 'ABC USA');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await checkM3U8('325', 'ESPN');
}

main().catch(console.error);
