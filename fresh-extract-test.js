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

async function test() {
  // Use Fight Club like the docs
  const tmdbId = '550';
  
  console.log('[1] Fetching embed...');
  const embedUrl = `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;
  const embedPage = await fetchPage(embedUrl);
  
  const hash = embedPage.match(/data-hash=["']([^"']+)["']/)[1];
  console.log('[2] Hash:', hash.substring(0, 50));
  
  console.log('[3] Fetching RCP...');
  const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
  const rcpPage = await fetchPage(rcpUrl, embedUrl);
  
  const prorcp = rcpPage.match(/\/prorcp\/([A-Za-z0-9+\/=\-_]+)/)?.[1];
  if (!prorcp) {
    console.log('[4] No prorcp found, checking for iframe...');
    const iframe = rcpPage.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];
    if (iframe) {
      console.log('[4] Found iframe:', iframe);
    } else {
      console.log('[4] No iframe either. Saving RCP page...');
      require('fs').writeFileSync('rcp-debug.html', rcpPage);
      console.log('Saved to rcp-debug.html');
    }
    return;
  }
  
  console.log('[4] ProRCP found');
  
  console.log('[5] Fetching player...');
  const playerUrl = `https://cloudnestra.com/prorcp/${prorcp}`;
  const playerPage = await fetchPage(playerUrl, rcpUrl);
  
  const match = playerPage.match(/<div[^>]+id="([^"]+)"[^>]*style="display:\s*none;?"[^>]*>([^<]+)<\/div>/i);
  if (!match) {
    console.log('[6] No hidden div found');
    return;
  }
  
  const divId = match[1];
  const encoded = match[2];
  
  console.log('[6] DivID:', divId);
  console.log('[6] Encoded length:', encoded.length);
  console.log('[6] First 100:', encoded.substring(0, 100));
  
  require('fs').writeFileSync('fresh-encoded.txt', encoded);
  require('fs').writeFileSync('player-page.html', playerPage);
  console.log('[6] Saved encoded to fresh-encoded.txt');
  console.log('[6] Saved player page to player-page.html');
  
  // Look for decoder script
  const scriptMatch = playerPage.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (scriptMatch) {
    console.log(`[7] Found ${scriptMatch.length} script tags`);
    require('fs').writeFileSync('player-scripts.txt', scriptMatch.join('\n\n=====\n\n'));
    console.log('[7] Saved scripts to player-scripts.txt');
  }
}

test().catch(console.error);
