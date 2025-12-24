/**
 * Test Dragon Ball franchise - all series
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

async function testAnime(name, search, encrypt, decrypt) {
  try {
    // Search
    const searchResult = await fetchJson(`https://animekai.to/ajax/anime/search?keyword=${encodeURIComponent(search)}`);
    if (!searchResult.data?.result?.html) return { name, success: false, error: 'No results' };
    
    const slugMatch = searchResult.data.result.html.match(/href="\/watch\/([^"]+)"/);
    if (!slugMatch) return { name, success: false, error: 'No slug' };
    
    // Get kai_id from syncData
    const watchResult = await fetchHtml(`https://animekai.to/watch/${slugMatch[1]}`);
    
    let kaiId = null;
    const syncDataMatch = watchResult.html.match(/<script[^>]*id="syncData"[^>]*>([\s\S]*?)<\/script>/i);
    if (syncDataMatch) {
      try {
        const syncData = JSON.parse(syncDataMatch[1]);
        if (syncData.anime_id) kaiId = syncData.anime_id;
      } catch {}
    }
    
    if (!kaiId) {
      const dataIds = watchResult.html.match(/data-id="([a-zA-Z0-9_-]{4,10})"/g) || [];
      const reserved = ['signin', 'report', 'request', 'anime', 'episode', 'sub', 'dub'];
      for (const match of dataIds) {
        const id = match.match(/data-id="([^"]+)"/)?.[1];
        if (id && !reserved.includes(id.toLowerCase()) && id.length >= 4) {
          kaiId = id;
          break;
        }
      }
    }
    
    if (!kaiId) return { name, success: false, error: 'No kai_id' };
    
    // Get episodes
    const encKaiId = encrypt(kaiId);
    const episodesResult = await fetchJson(`https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=${encKaiId}`);
    
    if (!episodesResult.data?.result) return { name, success: false, error: 'Episodes failed' };
    
    const tokens = episodesResult.data.result.match(/token="([^"]+)"/g) || [];
    if (tokens.length === 0) return { name, success: false, error: 'No tokens' };
    
    const tokenMatch = episodesResult.data.result.match(/token="([^"]+)"/);
    const token = tokenMatch[1];
    
    // Get servers
    const encToken = encrypt(token);
    const serversResult = await fetchJson(`https://animekai.to/ajax/links/list?token=${token}&_=${encToken}`);
    
    if (!serversResult.data?.result) return { name, success: false, error: 'Servers failed' };
    
    const lidMatch = serversResult.data.result.match(/data-lid="([^"]+)"/);
    if (!lidMatch) return { name, success: false, error: 'No lid' };
    
    // Get embed
    const lid = lidMatch[1];
    const encLid = encrypt(lid);
    const embedResult = await fetchJson(`https://animekai.to/ajax/links/view?id=${lid}&_=${encLid}`);
    
    if (!embedResult.data?.result) return { name, success: false, error: 'Embed failed' };
    
    // Decrypt
    let decrypted = decrypt(embedResult.data.result);
    decrypted = decrypted.replace(/}([0-9A-Fa-f]{2})/g, (_, hex) => 
      String.fromCharCode(parseInt(hex, 16))
    );
    
    const streamData = JSON.parse(decrypted);
    
    return { 
      name, 
      success: true, 
      slug: slugMatch[1],
      episodes: tokens.length,
      embedUrl: streamData.url 
    };
  } catch (e) {
    return { name, success: false, error: e.message };
  }
}

async function main() {
  const { encryptAnimeKai, decryptAnimeKai } = await import('../app/lib/animekai-crypto.ts');
  
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              DRAGON BALL FRANCHISE TEST                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  const dragonBallSeries = [
    { name: 'Dragon Ball (Original)', search: 'dragon ball 1986' },
    { name: 'Dragon Ball Z', search: 'dragon ball z' },
    { name: 'Dragon Ball Z Kai', search: 'dragon ball kai' },
    { name: 'Dragon Ball GT', search: 'dragon ball gt' },
    { name: 'Dragon Ball Super', search: 'dragon ball super' },
    { name: 'Dragon Ball Super: Broly', search: 'dragon ball super broly' },
    { name: 'Dragon Ball Super: Super Hero', search: 'dragon ball super hero' },
    { name: 'Dragon Ball Daima', search: 'dragon ball daima' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const series of dragonBallSeries) {
    process.stdout.write(`Testing ${series.name.padEnd(35)} `);
    
    const result = await testAnime(series.name, series.search, encryptAnimeKai, decryptAnimeKai);
    
    if (result.success) {
      console.log(`✓ PASS (${result.episodes} eps)`);
      passed++;
    } else {
      console.log(`✗ FAIL (${result.error})`);
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${dragonBallSeries.length} tests`);
  console.log('════════════════════════════════════════════════════════════════════');
}

main().catch(console.error);
