/**
 * STREAMSRCS.2EMBED.CC REVERSE ENGINEERING
 * 
 * Analyzes the streamsrcs player to extract M3U8 URLs
 */

const https = require('https');
const { Buffer } = require('buffer');
const fs = require('fs');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      method = 'GET',
      headers = {},
      timeout = 15000,
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

async function analyzeStreamsrcs() {
  console.log('\n' + '='.repeat(80));
  console.log('STREAMSRCS.2EMBED.CC REVERSE ENGINEERING');
  console.log('='.repeat(80) + '\n');

  const playerUrl = 'https://streamsrcs.2embed.cc/swish?id=1lzngys5exf9';
  
  try {
    // Step 1: Fetch swish.js
    console.log('[1] Fetching swish.js...');
    const swishResponse = await fetch('https://streamsrcs.2embed.cc/swish.js', {
      referer: playerUrl
    });
    
    console.log(`    ✓ Got ${swishResponse.body.length} bytes`);
    fs.writeFileSync('swish.js', swishResponse.body);
    console.log('    ✓ Saved to swish.js');
    
    // Analyze swish.js
    console.log('\n[2] Analyzing swish.js...');
    
    // Look for URL patterns
    const urlPattern = /["'](https?:\/\/[^"']+)["']/g;
    const urls = [...swishResponse.body.matchAll(urlPattern)];
    
    if (urls.length > 0) {
      console.log(`    ✓ Found ${urls.length} URL(s) in script:`);
      urls.slice(0, 10).forEach((match, i) => {
        console.log(`      ${i + 1}. ${match[1]}`);
      });
    }
    
    // Look for iframe manipulation
    if (swishResponse.body.includes('framesrc')) {
      console.log('    ✓ Script manipulates #framesrc iframe');
    }
    
    if (swishResponse.body.includes('.src')) {
      console.log('    ✓ Script modifies iframe src');
    }
    
    // Look for patterns like player4u's jqueryjs.js
    const srcPattern = /\.src\s*=\s*["']([^"']+)["']/g;
    const srcMatches = [...swishResponse.body.matchAll(srcPattern)];
    
    if (srcMatches.length > 0) {
      console.log(`    ✓ Found ${srcMatches.length} src assignment(s):`);
      srcMatches.forEach((match, i) => {
        console.log(`      ${i + 1}. ${match[1]}`);
      });
    }
    
    // Step 3: Try to construct the actual iframe URL
    console.log('\n[3] Attempting to construct iframe URL...');
    
    // The iframe src is just the ID: "1lzngys5exf9"
    // swish.js likely prepends a domain
    
    // Common patterns from player4u
    const possibleDomains = [
      'https://yesmovies.baby/e/',
      'https://streamsrcs.2embed.cc/e/',
      'https://streamsrcs.2embed.cc/',
      'https://2embed.cc/e/',
      'https://www.2embed.cc/e/'
    ];
    
    console.log('    Testing possible iframe URLs...');
    
    for (const domain of possibleDomains) {
      const testUrl = `${domain}1lzngys5exf9`;
      console.log(`\n    [${possibleDomains.indexOf(domain) + 1}/${possibleDomains.length}] Testing: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl, { referer: playerUrl });
        console.log(`        ✓ Got ${response.status} - ${response.body.length} bytes`);
        
        if (response.status === 200 && response.body.length > 1000) {
          console.log('        ✓ Valid response! Saving...');
          fs.writeFileSync(`streamsrcs-iframe-${possibleDomains.indexOf(domain)}.html`, response.body);
          
          // Check for M3U8
          if (response.body.includes('.m3u8')) {
            console.log('        🎯 Contains .m3u8 references!');
            
            const m3u8Pattern = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g;
            const m3u8Matches = response.body.match(m3u8Pattern);
            
            if (m3u8Matches) {
              console.log(`        🎯 Found ${m3u8Matches.length} M3U8 URL(s):`);
              m3u8Matches.slice(0, 3).forEach((url, i) => {
                console.log(`            ${i + 1}. ${url.substring(0, 80)}...`);
              });
            }
          }
          
          // Check for obfuscated code
          if (response.body.includes('eval(function')) {
            console.log('        ✓ Contains obfuscated code - can decode!');
          }
        }
      } catch (error) {
        console.log(`        ✗ Failed: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

if (require.main === module) {
  analyzeStreamsrcs().catch(console.error);
}

module.exports = { analyzeStreamsrcs };
