/**
 * Direct fetch of Superembed srcrcp page with proper headers
 */

const https = require('https');
const fs = require('fs');

function fetchPage(url, referer, origin, followRedirects = true) {
  return new Promise((resolve, reject) => {
    const zlib = require('zlib');
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': origin,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site'
      }
    }, res => {
      console.log('Status:', res.statusCode);
      console.log('Content-Encoding:', res.headers['content-encoding']);
      
      // Handle redirects
      if (followRedirects && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)) {
        const redirectUrl = res.headers.location;
        console.log('Redirecting to:', redirectUrl);
        return fetchPage(redirectUrl, referer, origin, followRedirects).then(resolve).catch(reject);
      }
      
      let stream = res;
      const encoding = res.headers['content-encoding'];
      
      if (encoding === 'br') {
        stream = res.pipe(zlib.createBrotliDecompress());
      } else if (encoding === 'gzip') {
        stream = res.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        stream = res.pipe(zlib.createInflate());
      }
      
      let data = '';
      stream.on('data', chunk => data += chunk);
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

function extractSuperembedHash(html) {
  const match = html.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?Superembed/i);
  return match ? match[1] : null;
}

function extractSrcRcpUrl(html) {
  const match = html.match(/['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/);
  return match ? `https://cloudnestra.com/srcrcp/${match[1]}` : null;
}

async function test() {
  const tmdbId = '550';
  const type = 'movie';
  
  // Step 1: Get embed page
  const embedUrl = `https://vidsrc-embed.ru/embed/${type}/${tmdbId}`;
  console.log('Fetching embed page:', embedUrl);
  const embedPage = await fetchPage(embedUrl, 'https://vidsrc-embed.ru/', 'https://vidsrc-embed.ru');
  
  const hash = extractSuperembedHash(embedPage);
  console.log('\nSuperembed hash:', hash ? hash.substring(0, 50) + '...' : 'NOT FOUND');
  
  if (!hash) return;
  
  // Step 2: Get RCP page
  const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
  console.log('\nFetching RCP page:', rcpUrl);
  const rcpPage = await fetchPage(rcpUrl, embedUrl, 'https://vidsrc-embed.ru');
  
  const srcRcpUrl = extractSrcRcpUrl(rcpPage);
  console.log('\nSrcRCP URL:', srcRcpUrl || 'NOT FOUND');
  
  if (!srcRcpUrl) return;
  
  // Step 3: Get SrcRCP page with proper headers
  console.log('\nFetching SrcRCP page with vidsrc-embed.ru referer...');
  const srcRcpPage = await fetchPage(srcRcpUrl, embedUrl, 'https://vidsrc-embed.ru');
  
  // Save to file
  fs.writeFileSync('superembed-srcrcp-direct.html', srcRcpPage);
  console.log('\n✓ Saved to superembed-srcrcp-direct.html');
  console.log('File size:', srcRcpPage.length, 'bytes');
  
  // Search for video sources
  console.log('\nSearching for video sources...');
  
  const m3u8Matches = srcRcpPage.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g);
  if (m3u8Matches) {
    console.log('\n🎯 Found M3U8 URLs:');
    m3u8Matches.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  }
  
  const mp4Matches = srcRcpPage.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g);
  if (mp4Matches) {
    console.log('\n🎯 Found MP4 URLs:');
    mp4Matches.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  }
  
  // Look for common video player patterns
  const patterns = [
    /sources?\s*[:=]\s*["']([^"']+)["']/gi,
    /file\s*[:=]\s*["']([^"']+)["']/gi,
    /src\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
    /url\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi
  ];
  
  console.log('\nSearching with patterns...');
  for (const pattern of patterns) {
    const matches = [...srcRcpPage.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`\nPattern ${pattern}:`);
      matches.forEach(match => {
        if (match[1] && (match[1].includes('http') || match[1].includes('.m3u8') || match[1].includes('.mp4'))) {
          console.log(`  - ${match[1]}`);
        }
      });
    }
  }
  
  // Check for base64 encoded content
  const base64Pattern = /["']([A-Za-z0-9+\/]{100,}={0,2})["']/g;
  const base64Matches = [...srcRcpPage.matchAll(base64Pattern)];
  if (base64Matches.length > 0) {
    console.log(`\n📦 Found ${base64Matches.length} potential base64 strings`);
    console.log('Checking first few...');
    for (let i = 0; i < Math.min(5, base64Matches.length); i++) {
      try {
        const decoded = Buffer.from(base64Matches[i][1], 'base64').toString('utf-8');
        if (decoded.includes('http') || decoded.includes('.m3u8') || decoded.includes('.mp4')) {
          console.log(`\n  Decoded #${i + 1}:`, decoded.substring(0, 200));
        }
      } catch (e) {}
    }
  }
}

test().catch(console.error);
