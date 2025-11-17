/**
 * PLAYER4U REVERSE ENGINEER
 * 
 * Analyzes player4u.xyz to extract M3U8 URLs
 */

const https = require('https');
const { Buffer } = require('buffer');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      method = 'GET',
      headers = {},
      timeout = 10000,
      referer,
      origin
    } = options;

    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      ...headers
    };

    if (referer) defaultHeaders['Referer'] = referer;
    if (origin) defaultHeaders['Origin'] = origin;

    const req = https.request(url, {
      method,
      headers: defaultHeaders,
      timeout
    }, res => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetch(res.headers.location, options).then(resolve).catch(reject);
      }

      let data = [];
      const encoding = res.headers['content-encoding'];

      let stream = res;
      if (encoding === 'gzip') {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createInflate());
      } else if (encoding === 'br') {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createBrotliDecompress());
      }

      stream.on('data', chunk => data.push(chunk));
      stream.on('end', () => {
        const body = Buffer.concat(data).toString('utf-8');
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
      stream.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function analyzePlayer() {
  const playerUrl = 'https://player4u.xyz/embed?key=Better Call Saul S06E02';
  
  console.log('Fetching player page:', playerUrl);
  const playerResponse = await fetch(playerUrl);
  
  console.log('Player page size:', playerResponse.body.length);
  
  // Extract all /swp/ links
  const swpPattern = /go\(['"]\/swp\/\?id=([^&]+)&tit=([^&]+)&pltm=(\d+)['"]\)/g;
  const matches = [...playerResponse.body.matchAll(swpPattern)];
  
  console.log(`\nFound ${matches.length} video sources:\n`);
  
  if (matches.length > 0) {
    // Test the first one
    const firstMatch = matches[0];
    const id = firstMatch[1];
    const title = decodeURIComponent(firstMatch[2].replace(/\+/g, ' '));
    const pltm = firstMatch[3];
    
    console.log(`Testing first source:`);
    console.log(`  ID: ${id}`);
    console.log(`  Title: ${title}`);
    console.log(`  PLTM: ${pltm}`);
    
    const swpUrl = `https://player4u.xyz/swp/?id=${id}&tit=${encodeURIComponent(title)}&pltm=${pltm}`;
    console.log(`\nFetching SWP page: ${swpUrl}`);
    
    const swpResponse = await fetch(swpUrl, {
      referer: playerUrl
    });
    
    console.log(`SWP page size: ${swpResponse.body.length}`);
    
    // Save for analysis
    const fs = require('fs');
    fs.writeFileSync('debug-swp-page.html', swpResponse.body);
    console.log('Saved to debug-swp-page.html');
    
    // Look for M3U8 URLs
    const m3u8Patterns = [
      /file:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
      /source:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
      /src:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
      /"file":\s*["']([^"']+\.m3u8[^"']*)["']/gi,
      /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g,
      /sources:\s*\[([^\]]+)\]/gi
    ];
    
    console.log('\nSearching for M3U8 URLs...');
    
    for (const pattern of m3u8Patterns) {
      const m3u8Matches = [...swpResponse.body.matchAll(pattern)];
      if (m3u8Matches.length > 0) {
        console.log(`\nFound with pattern ${pattern}:`);
        m3u8Matches.forEach((match, i) => {
          console.log(`  ${i + 1}. ${match[1] || match[0]}`);
        });
      }
    }
    
    // Look for any video player initialization
    const playerPatterns = [
      /jwplayer\([^)]+\)\.setup\(([^;]+)\)/gi,
      /videojs\([^)]+,\s*({[^}]+})/gi,
      /Plyr\([^,]+,\s*({[^}]+})/gi,
      /new\s+Player\([^)]+\)/gi
    ];
    
    console.log('\nSearching for player initialization...');
    
    for (const pattern of playerPatterns) {
      const playerMatches = [...swpResponse.body.matchAll(pattern)];
      if (playerMatches.length > 0) {
        console.log(`\nFound player init with pattern ${pattern}:`);
        playerMatches.forEach((match, i) => {
          console.log(`  ${i + 1}. ${match[0].substring(0, 200)}...`);
        });
      }
    }
    
    // Look for base64 encoded data
    const base64Pattern = /["']([A-Za-z0-9+\/]{100,}={0,2})["']/g;
    const base64Matches = [...swpResponse.body.matchAll(base64Pattern)];
    
    if (base64Matches.length > 0) {
      console.log(`\nFound ${base64Matches.length} potential base64 strings, checking first 3...`);
      for (let i = 0; i < Math.min(3, base64Matches.length); i++) {
        try {
          const decoded = Buffer.from(base64Matches[i][1], 'base64').toString('utf-8');
          if (decoded.includes('http') || decoded.includes('.m3u8')) {
            console.log(`\nDecoded base64 #${i + 1}:`);
            console.log(decoded.substring(0, 300));
          }
        } catch (e) {}
      }
    }
    
    // Check for nested iframe
    const iframeMatch = swpResponse.body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch) {
      let iframeSrc = iframeMatch[1];
      console.log(`\nFound nested iframe: ${iframeSrc}`);
      
      // If relative, make it absolute
      if (!iframeSrc.startsWith('http')) {
        iframeSrc = `https://player4u.xyz/swp/${iframeSrc}`;
      }
      
      console.log(`\nFetching nested iframe: ${iframeSrc}`);
      const iframeResponse = await fetch(iframeSrc, {
        referer: swpUrl
      });
      
      console.log(`Nested iframe size: ${iframeResponse.body.length}`);
      
      const fs = require('fs');
      fs.writeFileSync('debug-nested-iframe.html', iframeResponse.body);
      console.log('Saved to debug-nested-iframe.html');
      
      // Search for M3U8 in nested iframe
      console.log('\nSearching for M3U8 in nested iframe...');
      const m3u8InNested = iframeResponse.body.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g);
      if (m3u8InNested) {
        console.log('\n🎯 FOUND M3U8 URLs:');
        m3u8InNested.forEach((url, i) => {
          console.log(`  ${i + 1}. ${url}`);
        });
      }
      
      // Check for player config
      const configMatch = iframeResponse.body.match(/file:\s*["']([^"']+)["']/i);
      if (configMatch) {
        console.log(`\n🎯 FOUND file config: ${configMatch[1]}`);
      }
    }
    
    // Check for jqueryjs.js script
    if (swpResponse.body.includes('jqueryjs.js')) {
      console.log('\nFound jqueryjs.js script, fetching...');
      const scriptUrl = 'https://player4u.xyz/swp/jqueryjs.js';
      const scriptResponse = await fetch(scriptUrl, {
        referer: swpUrl
      });
      
      const fs = require('fs');
      fs.writeFileSync('debug-jqueryjs.js', scriptResponse.body);
      console.log('Saved to debug-jqueryjs.js');
      console.log(`Script size: ${scriptResponse.body.length}`);
      
      // Parse the script to find the actual player URL pattern
      const urlPatternMatch = scriptResponse.body.match(/["'](https?:\/\/[^"']+)["']\s*\+\s*myUrl/);
      if (urlPatternMatch) {
        const baseUrl = urlPatternMatch[1];
        console.log(`\n🔍 Found URL pattern: ${baseUrl} + iframe_src`);
        
        // Get the iframe src from SWP page
        const iframeSrcMatch = swpResponse.body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (iframeSrcMatch) {
          const iframeSrc = iframeSrcMatch[1];
          const finalPlayerUrl = `${baseUrl}${iframeSrc}`;
          
          console.log(`\n🎯 FINAL PLAYER URL: ${finalPlayerUrl}`);
          console.log('\nFetching final player page...');
          
          const finalPlayerResponse = await fetch(finalPlayerUrl, {
            referer: swpUrl
          });
          
          console.log(`Final player page size: ${finalPlayerResponse.body.length}`);
          
          fs.writeFileSync('debug-final-player.html', finalPlayerResponse.body);
          console.log('Saved to debug-final-player.html');
          
          // Extract M3U8 from final player
          console.log('\n🔍 Searching for M3U8 in final player...');
          
          const m3u8Patterns = [
            /file:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /source:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /["']([^"']*https?:\/\/[^"']+\.m3u8[^"']*)["']/gi,
            /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g
          ];
          
          for (const pattern of m3u8Patterns) {
            const m3u8Matches = [...finalPlayerResponse.body.matchAll(pattern)];
            if (m3u8Matches.length > 0) {
              console.log(`\n✅ FOUND M3U8 URLs:`);
              m3u8Matches.forEach((match, i) => {
                const url = match[1] || match[0];
                console.log(`  ${i + 1}. ${url}`);
              });
              break;
            }
          }
        }
      }
    }
  }
}

analyzePlayer().catch(console.error);
