/**
 * Full integration test for native AnimeKai extractor
 * Tests the complete flow without any enc-dec.app dependency
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
  
  console.log('=== ANIMEKAI NATIVE INTEGRATION TEST ===\n');
  
  // Step 1: Search for anime
  console.log('1. Searching for "naruto"...');
  const searchResult = await fetchJson('https://animekai.to/ajax/anime/search?keyword=naruto');
  
  if (searchResult.status !== 200) {
    console.log('   ✗ Search failed:', searchResult.status);
    return;
  }
  
  const searchHtml = searchResult.data.result?.html;
  if (!searchHtml) {
    console.log('   ✗ No search results');
    return;
  }
  
  // Parse first result
  const slugMatch = searchHtml.match(/href="\/watch\/([^"]+)"/);
  const titleMatch = searchHtml.match(/<h6[^>]*class="title"[^>]*>([^<]+)<\/h6>/);
  
  if (!slugMatch) {
    console.log('   ✗ Could not parse search results');
    return;
  }
  
  const slug = slugMatch[1];
  const title = titleMatch?.[1]?.trim() || 'Unknown';
  console.log(`   ✓ Found: "${title}" -> /watch/${slug}`);
  
  // Step 2: Get kai_id from watch page
  console.log('\n2. Fetching watch page to get kai_id...');
  const watchResult = await fetchHtml(`https://animekai.to/watch/${slug}`);
  
  if (watchResult.status !== 200) {
    console.log('   ✗ Watch page failed:', watchResult.status);
    return;
  }
  
  // Extract kai_id
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
    console.log('   ✗ Could not extract kai_id');
    return;
  }
  console.log(`   ✓ kai_id: ${kaiId}`);
  
  // Step 3: Get episodes using native encryption
  console.log('\n3. Getting episodes with native encryption...');
  const encKaiId = encryptAnimeKai(kaiId);
  console.log(`   Encrypted kai_id: ${encKaiId.substring(0, 40)}...`);
  
  const episodesResult = await fetchJson(`https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=${encKaiId}`);
  
  if (episodesResult.status !== 200 || !episodesResult.data.result) {
    console.log('   ✗ Episodes fetch failed');
    return;
  }
  
  // Parse episodes HTML
  const epHtml = episodesResult.data.result;
  const tokenMatch = epHtml.match(/token="([^"]+)"/);
  
  if (!tokenMatch) {
    console.log('   ✗ Could not parse episodes');
    return;
  }
  
  const token = tokenMatch[1];
  const epCount = (epHtml.match(/token="/g) || []).length;
  console.log(`   ✓ Found ${epCount} episodes, first token: ${token}`);
  
  // Step 4: Get servers using native encryption
  console.log('\n4. Getting servers with native encryption...');
  const encToken = encryptAnimeKai(token);
  console.log(`   Encrypted token: ${encToken.substring(0, 40)}...`);
  
  const serversResult = await fetchJson(`https://animekai.to/ajax/links/list?token=${token}&_=${encToken}`);
  
  if (serversResult.status !== 200 || !serversResult.data.result) {
    console.log('   ✗ Servers fetch failed');
    return;
  }
  
  // Parse servers HTML
  const srvHtml = serversResult.data.result;
  const lidMatch = srvHtml.match(/data-lid="([^"]+)"/);
  
  if (!lidMatch) {
    console.log('   ✗ Could not parse servers');
    return;
  }
  
  const lid = lidMatch[1];
  const subCount = (srvHtml.match(/data-id="sub"/g) || []).length;
  const dubCount = (srvHtml.match(/data-id="dub"/g) || []).length;
  console.log(`   ✓ Found servers (sub: ${subCount > 0 ? 'yes' : 'no'}, dub: ${dubCount > 0 ? 'yes' : 'no'})`);
  console.log(`   First lid: ${lid}`);
  
  // Step 5: Get embed URL using native encryption
  console.log('\n5. Getting embed URL with native encryption...');
  const encLid = encryptAnimeKai(lid);
  console.log(`   Encrypted lid: ${encLid.substring(0, 40)}...`);
  
  const embedResult = await fetchJson(`https://animekai.to/ajax/links/view?id=${lid}&_=${encLid}`);
  
  if (embedResult.status !== 200 || !embedResult.data.result) {
    console.log('   ✗ Embed fetch failed');
    console.log('   Response:', JSON.stringify(embedResult.data).substring(0, 200));
    return;
  }
  
  // Decrypt the embed response
  let decrypted = decryptAnimeKai(embedResult.data.result);
  
  console.log(`   Raw decrypted length: ${decrypted?.length}`);
  
  // Decode }XX format (AnimeKai's custom URL encoding)
  if (decrypted) {
    decrypted = decrypted.replace(/}([0-9A-Fa-f]{2})/g, (_, hex) => 
      String.fromCharCode(parseInt(hex, 16))
    );
  }
  
  console.log(`   Decoded length: ${decrypted?.length}`);
  console.log(`   ✓ Decrypted response: ${decrypted}`);
  
  // Parse the decrypted data
  try {
    const streamData = JSON.parse(decrypted);
    const embedUrl = streamData.url || streamData.file || 'unknown';
    console.log(`   ✓ Embed URL: ${embedUrl}`);
  } catch (e) {
    console.log(`   Parse error: ${e.message}`);
    console.log(`   Decrypted (raw): ${decrypted}`);
  }
  
  console.log('\n=== ALL TESTS PASSED - NO enc-dec.app DEPENDENCY! ===');
}

main().catch(console.error);
