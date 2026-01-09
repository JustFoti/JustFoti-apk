// Test VidSrc direct extraction - the file URL is in the page!
require('dotenv').config({ path: '.env.local' });

async function testVidSrc() {
  console.log('Testing VidSrc direct extraction...\n');
  
  const TMDB_ID = '550';
  
  // Step 1: Fetch embed page
  const embedUrl = `https://vidsrc-embed.ru/embed/movie/${TMDB_ID}`;
  console.log('1. Fetching embed:', embedUrl);
  
  const embedRes = await fetch(embedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const embedHtml = await embedRes.text();
  
  // Extract RCP iframe
  const iframeMatch = embedHtml.match(/<iframe[^>]*src=["']([^"']+cloudnestra\.com\/rcp\/([^"']+))["']/i);
  if (!iframeMatch) {
    console.log('No RCP iframe found');
    return;
  }
  
  const rcpPath = iframeMatch[2];
  console.log('   RCP path found');
  
  // Step 2: Fetch RCP page
  const rcpUrl = `https://cloudnestra.com/rcp/${rcpPath}`;
  console.log('\n2. Fetching RCP page...');
  
  const rcpRes = await fetch(rcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://vidsrc-embed.ru/'
    }
  });
  const rcpHtml = await rcpRes.text();
  
  // Extract prorcp path
  const prorcpMatch = rcpHtml.match(/['"]\/prorcp\/([^'"]+)['"]/i) || rcpHtml.match(/['"]\/srcrcp\/([^'"]+)['"]/i);
  if (!prorcpMatch) {
    console.log('No prorcp found');
    return;
  }
  
  const prorcpPath = prorcpMatch[1];
  const endpointType = rcpHtml.includes('/srcrcp/') ? 'srcrcp' : 'prorcp';
  console.log(`   ${endpointType} path found`);
  
  // Step 3: Fetch PRORCP page
  const prorcpUrl = `https://cloudnestra.com/${endpointType}/${prorcpPath}`;
  console.log(`\n3. Fetching ${endpointType.toUpperCase()} page...`);
  
  const prorcpRes = await fetch(prorcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://cloudnestra.com/'
    }
  });
  const prorcpHtml = await prorcpRes.text();
  console.log('   Page length:', prorcpHtml.length);
  
  // Step 4: Extract file URL directly from PlayerJS init
  console.log('\n4. Extracting file URL from PlayerJS...');
  
  // Pattern 1: file: "url" in Playerjs init
  const fileMatch = prorcpHtml.match(/file:\s*["']([^"']+)["']/);
  if (fileMatch) {
    const fileUrl = fileMatch[1];
    console.log('   Found file URL!');
    console.log('   Length:', fileUrl.length);
    
    // The URL contains multiple alternatives separated by " or "
    const urls = fileUrl.split(' or ');
    console.log('   Alternatives:', urls.length);
    
    // Extract unique base URLs
    const baseUrls = new Set();
    for (const url of urls) {
      // Replace {v1}, {v2}, etc. with actual domains
      const domains = [
        'shadowlandschronicles.com',
        'shadowlandschronicles.net',
        'shadowlandschronicles.org',
        'cloudnestra.com',
      ];
      
      for (const domain of domains) {
        const resolvedUrl = url.replace(/\{v\d+\}/g, domain);
        if (resolvedUrl.includes('master.m3u8') || resolvedUrl.includes('list.m3u8')) {
          baseUrls.add(resolvedUrl);
        }
      }
    }
    
    console.log('\n   Resolved URLs:');
    for (const url of [...baseUrls].slice(0, 5)) {
      console.log('   -', url.substring(0, 100) + '...');
    }
    
    // Test the first URL
    console.log('\n5. Testing first URL...');
    const testUrl = [...baseUrls][0];
    if (testUrl) {
      try {
        const testRes = await fetch(testUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://cloudnestra.com/'
          }
        });
        console.log('   Status:', testRes.status);
        if (testRes.ok) {
          const text = await testRes.text();
          console.log('   Content preview:', text.substring(0, 200));
          if (text.includes('#EXTM3U')) {
            console.log('   ✓ Valid M3U8 playlist!');
          }
        }
      } catch (e) {
        console.log('   Error:', e.message);
      }
    }
    
    return;
  }
  
  // Pattern 2: Look for file in different format
  const fileMatch2 = prorcpHtml.match(/["']file["']\s*:\s*["']([^"']+)["']/);
  if (fileMatch2) {
    console.log('   Found file (pattern 2):', fileMatch2[1].substring(0, 100));
    return;
  }
  
  // Pattern 3: Look for sources array
  const sourcesMatch = prorcpHtml.match(/sources\s*:\s*\[([^\]]+)\]/);
  if (sourcesMatch) {
    console.log('   Found sources array:', sourcesMatch[1].substring(0, 200));
    return;
  }
  
  console.log('   No file URL found in page');
  
  // Debug: show what we have
  console.log('\n   Debug - Looking for Playerjs init...');
  const playerjsMatch = prorcpHtml.match(/new\s+Playerjs\s*\(\s*\{[^}]+\}/);
  if (playerjsMatch) {
    console.log('   Playerjs init:', playerjsMatch[0].substring(0, 500));
  }
}

testVidSrc().catch(console.error);
