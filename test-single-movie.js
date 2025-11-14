const https = require('https');

// Test ONE movie: Sonic 3
const TMDB_ID = '1084736';

async function fetchPage(url, referer = 'https://vidsrc-embed.ru/') {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
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
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    return c;
  }).join('');
}

async function testExtraction() {
  console.log('Testing TMDB ID:', TMDB_ID);
  
  // Step 1: Get embed page
  const embedUrl = `https://vidsrc-embed.ru/embed/movie/${TMDB_ID}`;
  console.log('\n[1] Fetching embed page...');
  const embedPage = await fetchPage(embedUrl);
  console.log('[1] ✓ Got embed page');
  
  // Step 2: Extract hash
  const hashMatch = embedPage.match(/data-hash=["']([^"']+)["']/);
  if (!hashMatch) {
    console.log('[2] ✗ No hash found');
    return;
  }
  const hash = hashMatch[1];
  console.log('[2] ✓ Hash:', hash);
  
  // Step 3: Get RCP page
  const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
  console.log('\n[3] Fetching RCP page...');
  const rcpPage = await fetchPage(rcpUrl, embedUrl);
  console.log('[3] ✓ Got RCP page');
  
  // Step 4: Save RCP page to file for inspection
  require('fs').writeFileSync('rcp-page.html', rcpPage);
  console.log('[4] Saved RCP page to rcp-page.html');
  console.log('    Page title:', rcpPage.match(/<title>([^<]+)<\/title>/)?.[1] || 'No title');
  console.log('    Contains Cloudflare:', rcpPage.includes('cloudflare'));
  console.log('    Contains challenge:', rcpPage.includes('challenge'));
  return;
  
  // Step 5: Get player page
  console.log('\n[5] Fetching player page...');
  const playerPage = await fetchPage(playerUrl, rcpUrl);
  console.log('[5] ✓ Got player page');
  
  // Step 6: Extract hidden div
  const match = playerPage.match(/<div[^>]+id="([^"]+)"[^>]*style="display:\s*none;?"[^>]*>([^<]+)<\/div>/i);
  if (!match) {
    console.log('[6] ✗ No hidden div found');
    return;
  }
  
  const divId = match[1];
  const encoded = match[2];
  console.log('[6] ✓ Hidden div found');
  console.log('    DivID:', divId);
  console.log('    Encoded length:', encoded.length);
  console.log('    First 100 chars:', encoded.substring(0, 100));
  console.log('    Last 50 chars:', encoded.substring(encoded.length - 50));
  
  // Step 7: Try Base64 decode
  console.log('\n[7] Trying Base64 decode...');
  try {
    const base64Decoded = Buffer.from(encoded, 'base64').toString('utf8');
    console.log('    Base64 decoded length:', base64Decoded.length);
    console.log('    First 100 chars:', base64Decoded.substring(0, 100));
    
    if (base64Decoded.includes('http')) {
      console.log('[7] ✓ Base64 alone worked!');
      console.log('    URL:', base64Decoded);
      return;
    }
    
    // Try Caesar shifts on Base64 result
    console.log('    Base64 alone no URL, trying Caesar shifts...');
    for (let shift = 1; shift <= 5; shift++) {
      const caesarResult = caesarShift(base64Decoded, shift);
      if (caesarResult.includes('http')) {
        console.log(`[7] ✓ Base64 + Caesar ${shift} worked!`);
        console.log('    URL:', caesarResult);
        return;
      }
    }
    
    console.log('[7] ✗ Base64 + Caesar (1-5) failed');
  } catch (err) {
    console.log('[7] ✗ Base64 decode failed:', err.message);
  }
}

testExtraction().catch(console.error);
