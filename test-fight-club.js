// Test Fight Club (TMDB 550) with Caesar +3 method from docs
const https = require('https');

async function fetchPage(url, referer = 'https://vidsrc-embed.ru/') {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function caesarShift(text, shift) {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    }
    if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    }
    return c;
  }).join('');
}

async function test() {
  const tmdbId = '550'; // Fight Club
  
  console.log('Testing Fight Club (550) with Caesar +3...\n');
  
  // Step 1: Fetch embed
  console.log('[1] Fetching embed page...');
  const embedUrl = `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;
  const embedPage = await fetchPage(embedUrl);
  console.log('[1] ✓ Got embed page');
  
  // Step 2: Extract hash
  const hashMatch = embedPage.match(/data-hash=["']([^"']+)["']/);
  if (!hashMatch) {
    console.log('[2] ✗ No hash found');
    return;
  }
  const hash = hashMatch[1];
  console.log('[2] ✓ Hash:', hash.substring(0, 50) + '...');
  
  // Step 3: Fetch RCP
  console.log('[3] Fetching RCP page...');
  const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
  const rcpPage = await fetchPage(rcpUrl, embedUrl);
  console.log('[3] ✓ Got RCP page');
  
  // Step 4: Extract prorcp
  const prorcp = rcpPage.match(/\/prorcp\/([A-Za-z0-9+\/=\-_]+)/)?.[1];
  if (!prorcp) {
    console.log('[4] ✗ No prorcp found');
    return;
  }
  console.log('[4] ✓ ProRCP found');
  
  // Step 5: Fetch player
  console.log('[5] Fetching player page...');
  const playerUrl = `https://cloudnestra.com/prorcp/${prorcp}`;
  const playerPage = await fetchPage(playerUrl, rcpUrl);
  console.log('[5] ✓ Got player page');
  
  // Step 6: Extract hidden div
  const match = playerPage.match(/<div[^>]+id="([^"]+)"[^>]*style="display:\s*none;?"[^>]*>([^<]+)<\/div>/i);
  if (!match) {
    console.log('[6] ✗ No hidden div');
    return;
  }
  
  const divId = match[1];
  const encoded = match[2];
  console.log('[6] ✓ Hidden div found');
  console.log('    DivID:', divId);
  console.log('    Encoded length:', encoded.length);
  console.log('    First 50:', encoded.substring(0, 50));
  
  // Save for analysis
  require('fs').writeFileSync('fight-club-encoded.txt', encoded);
  require('fs').writeFileSync('fight-club-divid.txt', divId);
  console.log('    Saved to fight-club-encoded.txt');
  
  // Step 7: Try Caesar +3
  console.log('\n[7] Trying Caesar +3...');
  const decoded = caesarShift(encoded, 3);
  console.log('    Decoded first 50:', decoded.substring(0, 50));
  console.log('    Contains "http":', decoded.includes('http'));
  
  if (decoded.includes('http')) {
    console.log('\n*** SUCCESS! ***');
    const m3u8Match = decoded.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
    if (m3u8Match) {
      console.log('M3U8 URL:', m3u8Match[0]);
    } else {
      console.log('Full decoded:', decoded.substring(0, 200));
    }
  } else {
    console.log('\n[7] Caesar +3 failed, trying Caesar -3...');
    const decoded2 = caesarShift(encoded, -3);
    console.log('    Decoded first 50:', decoded2.substring(0, 50));
    console.log('    Contains "http":', decoded2.includes('http'));
    
    if (decoded2.includes('http')) {
      console.log('\n*** SUCCESS with Caesar -3! ***');
      const m3u8Match = decoded2.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (m3u8Match) {
        console.log('M3U8 URL:', m3u8Match[0]);
      }
    }
  }
}

test().catch(console.error);
