/**
 * VALIDATION: AnimeKai works WITHOUT enc-dec.app
 * Tests multiple anime to ensure native crypto handles all cases
 */
const https = require('https');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { 
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } 
        catch(e) { resolve({ status: res.statusCode, data, error: e.message }); } 
      });
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

async function testAnime(name, search, encrypt, decrypt) {
  const result = { name, steps: [], success: false, embedUrl: null };
  
  try {
    // Step 1: Search
    const searchResult = await fetchJson(`https://animekai.to/ajax/anime/search?keyword=${encodeURIComponent(search)}`);
    if (!searchResult.data?.result?.html) {
      result.steps.push({ step: 'search', success: false, error: 'No results' });
      return result;
    }
    
    const slugMatch = searchResult.data.result.html.match(/href="\/watch\/([^"]+)"/);
    if (!slugMatch) {
      result.steps.push({ step: 'search', success: false, error: 'No slug found' });
      return result;
    }
    result.steps.push({ step: 'search', success: true, slug: slugMatch[1] });
    
    // Step 2: Get kai_id - first try syncData, then fallback to data-id
    const watchResult = await fetchHtml(`https://animekai.to/watch/${slugMatch[1]}`);
    
    let kaiId = null;
    
    // Try syncData first (most reliable for long-running anime)
    const syncDataMatch = watchResult.html.match(/<script[^>]*id="syncData"[^>]*>([\s\S]*?)<\/script>/i);
    if (syncDataMatch) {
      try {
        const syncData = JSON.parse(syncDataMatch[1]);
        if (syncData.anime_id) {
          kaiId = syncData.anime_id;
        }
      } catch {}
    }
    
    // Fallback to data-id
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
    
    if (!kaiId) {
      result.steps.push({ step: 'kai_id', success: false, error: 'Not found' });
      return result;
    }
    result.steps.push({ step: 'kai_id', success: true, kaiId });
    
    // Step 3: Get episodes (NATIVE ENCRYPTION)
    const encKaiId = encrypt(kaiId);
    const episodesResult = await fetchJson(`https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=${encKaiId}`);
    
    if (!episodesResult.data?.result) {
      result.steps.push({ step: 'episodes', success: false, error: 'API rejected' });
      return result;
    }
    
    const tokenMatch = episodesResult.data.result.match(/token="([^"]+)"/);
    if (!tokenMatch) {
      result.steps.push({ step: 'episodes', success: false, error: 'No token' });
      return result;
    }
    
    const epCount = (episodesResult.data.result.match(/token="/g) || []).length;
    result.steps.push({ step: 'episodes', success: true, count: epCount });
    
    // Step 4: Get servers (NATIVE ENCRYPTION)
    const token = tokenMatch[1];
    const encToken = encrypt(token);
    const serversResult = await fetchJson(`https://animekai.to/ajax/links/list?token=${token}&_=${encToken}`);
    
    if (!serversResult.data?.result) {
      result.steps.push({ step: 'servers', success: false, error: 'API rejected' });
      return result;
    }
    
    const lidMatch = serversResult.data.result.match(/data-lid="([^"]+)"/);
    if (!lidMatch) {
      result.steps.push({ step: 'servers', success: false, error: 'No lid' });
      return result;
    }
    result.steps.push({ step: 'servers', success: true, lid: lidMatch[1] });
    
    // Step 5: Get embed (NATIVE ENCRYPTION + DECRYPTION)
    const lid = lidMatch[1];
    const encLid = encrypt(lid);
    const embedResult = await fetchJson(`https://animekai.to/ajax/links/view?id=${lid}&_=${encLid}`);
    
    if (!embedResult.data?.result) {
      result.steps.push({ step: 'embed', success: false, error: 'API rejected' });
      return result;
    }
    
    // NATIVE DECRYPTION
    let decrypted = decrypt(embedResult.data.result);
    decrypted = decrypted.replace(/}([0-9A-Fa-f]{2})/g, (_, hex) => 
      String.fromCharCode(parseInt(hex, 16))
    );
    
    const streamData = JSON.parse(decrypted);
    result.steps.push({ step: 'embed', success: true });
    result.embedUrl = streamData.url;
    result.success = true;
    
  } catch (e) {
    result.steps.push({ step: 'error', success: false, error: e.message });
  }
  
  return result;
}

async function main() {
  const { encryptAnimeKai, decryptAnimeKai } = await import('../app/lib/animekai-crypto.ts');
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║        ANIMEKAI VALIDATION - NO enc-dec.app DEPENDENCY             ║');
  console.log('║                                                                    ║');
  console.log('║  Testing native encryption/decryption across multiple anime        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const animeList = [
    { name: 'Naruto', search: 'naruto' },
    { name: 'Naruto Shippuden', search: 'naruto shippuden' },
    { name: 'One Piece', search: 'one piece' },
    { name: 'Bleach', search: 'bleach' },
    { name: 'Dragon Ball Z', search: 'dragon ball z' },
    { name: 'Attack on Titan', search: 'attack on titan' },
    { name: 'Jujutsu Kaisen', search: 'jujutsu kaisen' },
    { name: 'My Hero Academia', search: 'my hero academia' },
    { name: 'Death Note', search: 'death note' },
    { name: 'Fullmetal Alchemist', search: 'fullmetal alchemist brotherhood' },
    { name: 'Hunter x Hunter', search: 'hunter x hunter' },
    { name: 'Spy x Family', search: 'spy x family' },
    { name: 'Chainsaw Man', search: 'chainsaw man' },
    { name: 'Demon Slayer', search: 'kimetsu no yaiba' },
    { name: 'Tokyo Ghoul', search: 'tokyo ghoul' },
  ];
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (const anime of animeList) {
    process.stdout.write(`Testing ${anime.name.padEnd(25)} `);
    
    const result = await testAnime(anime.name, anime.search, encryptAnimeKai, decryptAnimeKai);
    results.push(result);
    
    if (result.success) {
      console.log('✓ PASS');
      passed++;
    } else {
      const lastStep = result.steps[result.steps.length - 1];
      console.log(`✗ FAIL (${lastStep?.step}: ${lastStep?.error || 'unknown'})`);
      failed++;
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${animeList.length} tests`);
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('');
  
  // Show successful embed URLs
  console.log('SUCCESSFUL EMBED URLs:');
  for (const r of results.filter(r => r.success)) {
    console.log(`  ${r.name}: ${r.embedUrl}`);
  }
  
  console.log('');
  
  // Show failures
  if (failed > 0) {
    console.log('FAILURES:');
    for (const r of results.filter(r => !r.success)) {
      const lastStep = r.steps[r.steps.length - 1];
      console.log(`  ${r.name}: ${lastStep?.step} - ${lastStep?.error}`);
    }
    console.log('');
  }
  
  // Final verdict
  const passRate = (passed / animeList.length * 100).toFixed(0);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  if (passRate >= 80) {
    console.log(`║  ✓✓✓ VALIDATION SUCCESSFUL - ${passRate}% pass rate                        ║`);
    console.log('║                                                                    ║');
    console.log('║  AnimeKai native crypto is WORKING without enc-dec.app!           ║');
  } else {
    console.log(`║  ⚠ VALIDATION PARTIAL - ${passRate}% pass rate                           ║`);
    console.log('║                                                                    ║');
    console.log('║  Some anime failed - may need additional tables or fixes          ║');
  }
  console.log('╚════════════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
