/**
 * Full stream extraction test - get actual playable stream URL
 */
const https = require('https');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { 
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } 
        catch(e) { resolve({ status: res.statusCode, data, error: e.message }); } 
      });
    }).on('error', reject);
  });
}

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

async function main() {
  const { encryptAnimeKai, decryptAnimeKai } = await import('../app/lib/animekai-crypto.ts');
  
  console.log('=== FULL STREAM EXTRACTION TEST ===\n');
  
  // Test with a popular anime
  const testAnimes = [
    { name: 'Jujutsu Kaisen', search: 'jujutsu kaisen' },
    { name: 'One Piece', search: 'one piece' },
  ];
  
  for (const anime of testAnimes) {
    console.log(`\n--- Testing: ${anime.name} ---`);
    
    // Search
    const searchResult = await fetchJson(`https://animekai.to/ajax/anime/search?keyword=${encodeURIComponent(anime.search)}`);
    if (searchResult.status !== 200 || !searchResult.data.result?.html) {
      console.log('  ✗ Search failed');
      continue;
    }
    
    const slugMatch = searchResult.data.result.html.match(/href="\/watch\/([^"]+)"/);
    if (!slugMatch) {
      console.log('  ✗ No results');
      continue;
    }
    
    const slug = slugMatch[1];
    console.log(`  Found: /watch/${slug}`);
    
    // Get kai_id
    const watchResult = await fetchHtml(`https://animekai.to/watch/${slug}`);
    const dataIds = watchResult.html.match(/data-id="([a-zA-Z0-9_-]{5,10})"/g) || [];
    const reserved = ['signin', 'report', 'request', 'anime', 'episode'];
    let kaiId = null;
    
    for (const match of dataIds) {
      const id = match.match(/data-id="([^"]+)"/)?.[1];
      if (id && !reserved.includes(id.toLowerCase())) {
        kaiId = id;
        break;
      }
    }
    
    if (!kaiId) {
      console.log('  ✗ No kai_id');
      continue;
    }
    console.log(`  kai_id: ${kaiId}`);
    
    // Get episodes
    const encKaiId = encryptAnimeKai(kaiId);
    const episodesResult = await fetchJson(`https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=${encKaiId}`);
    
    if (!episodesResult.data?.result) {
      console.log('  ✗ Episodes failed');
      continue;
    }
    
    const tokenMatch = episodesResult.data.result.match(/token="([^"]+)"/);
    if (!tokenMatch) {
      console.log('  ✗ No token');
      continue;
    }
    
    const token = tokenMatch[1];
    const epCount = (episodesResult.data.result.match(/token="/g) || []).length;
    console.log(`  Episodes: ${epCount}, token: ${token.substring(0, 15)}...`);
    
    // Get servers
    const encToken = encryptAnimeKai(token);
    const serversResult = await fetchJson(`https://animekai.to/ajax/links/list?token=${token}&_=${encToken}`);
    
    if (!serversResult.data?.result) {
      console.log('  ✗ Servers failed');
      continue;
    }
    
    const lidMatch = serversResult.data.result.match(/data-lid="([^"]+)"/);
    if (!lidMatch) {
      console.log('  ✗ No lid');
      continue;
    }
    
    const lid = lidMatch[1];
    console.log(`  lid: ${lid}`);
    
    // Get embed
    const encLid = encryptAnimeKai(lid);
    const embedResult = await fetchJson(`https://animekai.to/ajax/links/view?id=${lid}&_=${encLid}`);
    
    if (!embedResult.data?.result) {
      console.log('  ✗ Embed failed');
      continue;
    }
    
    // Decrypt
    let decrypted = decryptAnimeKai(embedResult.data.result);
    
    // Decode }XX format
    if (decrypted) {
      decrypted = decrypted.replace(/}([0-9A-Fa-f]{2})/g, (_, hex) => 
        String.fromCharCode(parseInt(hex, 16))
      );
    }
    
    try {
      const streamData = JSON.parse(decrypted);
      console.log(`  ✓ Embed URL: ${streamData.url}`);
      
      if (streamData.skip) {
        console.log(`  ✓ Skip data: intro=${JSON.stringify(streamData.skip.intro)}, outro=${JSON.stringify(streamData.skip.outro)}`);
      }
    } catch (e) {
      console.log(`  ✗ Parse error: ${e.message}`);
      console.log(`  Raw: ${decrypted?.substring(0, 100)}`);
    }
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

main().catch(console.error);
