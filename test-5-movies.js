// Test 5 different movies to check success rate
const https = require('https');

const movies = [
  { id: '550', name: 'Fight Club' },
  { id: '1084736', name: 'Sonic 3' },
  { id: '1054867', name: 'Mufasa' },
  { id: '558449', name: 'Gladiator II' },
  { id: '912649', name: 'Venom 3' }
];

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

async function testMovie(movie) {
  try {
    const embedUrl = `https://vidsrc-embed.ru/embed/movie/${movie.id}`;
    const embedPage = await fetchPage(embedUrl);
    
    const hashMatch = embedPage.match(/data-hash=["']([^"']+)["']/);
    if (!hashMatch) return { success: false, error: 'No hash' };
    
    const rcpUrl = `https://cloudnestra.com/rcp/${hashMatch[1]}`;
    const rcpPage = await fetchPage(rcpUrl, embedUrl);
    
    const prorcp = rcpPage.match(/\/prorcp\/([A-Za-z0-9+\/=\-_]+)/)?.[1];
    if (!prorcp) return { success: false, error: 'No prorcp (Cloudflare?)' };
    
    const playerUrl = `https://cloudnestra.com/prorcp/${prorcp}`;
    const playerPage = await fetchPage(playerUrl, rcpUrl);
    
    const match = playerPage.match(/<div[^>]+id="([^"]+)"[^>]*style="display:\s*none;?"[^>]*>([^<]+)<\/div>/i);
    if (!match) return { success: false, error: 'No hidden div' };
    
    const encoded = match[2];
    return { success: true, encodedLength: encoded.length, encodedPreview: encoded.substring(0, 30) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log('Testing 5 movies for CloudStream extraction...\n');
  
  let successCount = 0;
  
  for (const movie of movies) {
    console.log(`Testing: ${movie.name} (${movie.id})`);
    const result = await testMovie(movie);
    
    if (result.success) {
      console.log(`  ✓ SUCCESS - Got encoded data (${result.encodedLength} bytes)`);
      console.log(`    Preview: ${result.encodedPreview}...`);
      successCount++;
    } else {
      console.log(`  ✗ FAILED - ${result.error}`);
    }
    console.log('');
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Success: ${successCount}/${movies.length} (${Math.round(successCount/movies.length*100)}%)`);
  console.log(`\nNote: Success means we got the encoded data.`);
  console.log(`Decoding the data is a separate issue - encryption has changed.`);
}

runTests().catch(console.error);
