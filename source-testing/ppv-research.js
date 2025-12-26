/**
 * PPV.to Stream Extractor - Final Version
 * 
 * DISCOVERED FLOW:
 * 1. API: https://api.ppvs.su/api/streams - returns all events with categories
 * 2. Embed: https://pooembed.top/embed/{uri_name} - contains base64-encoded m3u8 URL
 * 3. Pattern: const src = atob("base64_encoded_m3u8_url");
 * 
 * Stream URL format: https://{server}.poocloud.in/{path}/index.m3u8
 */

const API_BASE = 'https://api.ppvs.su/api';
const EMBED_BASE = 'https://pooembed.top';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Origin': 'https://ppv.to',
  'Referer': 'https://ppv.to/',
};

// Get all streams/events from API
async function getAllStreams() {
  const response = await fetch(`${API_BASE}/streams`, { headers });
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Failed to fetch streams');
  }
  
  return data.streams; // Array of categories with streams
}

// Extract m3u8 URL from embed page
async function extractM3U8(uriName) {
  const embedUrl = `${EMBED_BASE}/embed/${uriName}`;
  
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://ppv.to/',
    },
  });
  
  const html = await response.text();
  
  // Pattern 1: const src = atob("base64_string");
  const atobPattern = /const\s+src\s*=\s*atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/;
  const atobMatch = html.match(atobPattern);
  
  if (atobMatch) {
    const base64 = atobMatch[1];
    const m3u8Url = Buffer.from(base64, 'base64').toString('utf-8');
    return { m3u8Url, method: 'atob' };
  }
  
  // Pattern 2: Direct file URL in JWPlayer setup
  const filePattern = /file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/;
  const fileMatch = html.match(filePattern);
  
  if (fileMatch) {
    return { m3u8Url: fileMatch[1], method: 'direct' };
  }
  
  // Pattern 3: Look for any m3u8 URL
  const m3u8Pattern = /["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/;
  const m3u8Match = html.match(m3u8Pattern);
  
  if (m3u8Match) {
    return { m3u8Url: m3u8Match[1], method: 'regex' };
  }
  
  return { m3u8Url: null, method: 'not_found', html: html.substring(0, 2000) };
}

// Test the extraction on multiple streams
async function testExtraction() {
  console.log('=== PPV.to Stream Extraction Test ===\n');
  
  const categories = await getAllStreams();
  
  console.log(`Found ${categories.length} categories\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const category of categories) {
    console.log(`\n--- ${category.category} (${category.streams.length} streams) ---`);
    
    // Test first 2 streams from each category
    for (const stream of category.streams.slice(0, 2)) {
      console.log(`\n${stream.name}`);
      console.log(`  URI: ${stream.uri_name}`);
      console.log(`  ID: ${stream.id}`);
      console.log(`  Starts: ${new Date(stream.starts_at * 1000).toISOString()}`);
      
      try {
        const result = await extractM3U8(stream.uri_name);
        
        if (result.m3u8Url) {
          console.log(`  ✅ M3U8: ${result.m3u8Url}`);
          console.log(`  Method: ${result.method}`);
          successCount++;
          
          // Test if the m3u8 is accessible
          try {
            const m3u8Response = await fetch(result.m3u8Url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://pooembed.top/',
              },
            });
            console.log(`  M3U8 Status: ${m3u8Response.status}`);
            
            if (m3u8Response.ok) {
              const m3u8Content = await m3u8Response.text();
              console.log(`  M3U8 Preview: ${m3u8Content.substring(0, 200).replace(/\n/g, ' ')}`);
            }
          } catch (e) {
            console.log(`  M3U8 fetch error: ${e.message}`);
          }
        } else {
          console.log(`  ❌ No M3U8 found (${result.method})`);
          failCount++;
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        failCount++;
      }
    }
  }
  
  console.log(`\n\n=== Summary ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

testExtraction();
