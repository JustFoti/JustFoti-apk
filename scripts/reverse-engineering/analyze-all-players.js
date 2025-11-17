/**
 * COMPREHENSIVE PLAYER ANALYSIS
 * 
 * Analyzes ALL player types from 2embed to find M3U8 extraction methods
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzePlayer(playerUrl, testName, referer) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ANALYZING: ${testName}`);
  console.log('='.repeat(80));
  console.log(`Player URL: ${playerUrl}`);
  console.log('='.repeat(80) + '\n');

  try {
    console.log('[1] Fetching player page...');
    const response = await fetch(playerUrl, { referer });
    
    console.log(`    ✓ Got ${response.body.length} bytes`);
    
    // Save the page
    const filename = `player-${testName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    fs.writeFileSync(filename, response.body);
    console.log(`    ✓ Saved to ${filename}`);
    
    console.log('\n[2] Analyzing page structure...');
    
    // Check for various patterns
    const patterns = {
      'eval(function': response.body.includes('eval(function'),
      'jwplayer': response.body.includes('jwplayer'),
      'videojs': response.body.includes('videojs'),
      'Plyr': response.body.includes('Plyr'),
      '.m3u8': response.body.includes('.m3u8'),
      '.mp4': response.body.includes('.mp4'),
      'sources': response.body.includes('sources'),
      'file:': response.body.includes('file:'),
      'iframe': response.body.includes('<iframe'),
      'script src': response.body.match(/<script[^>]+src=["']([^"']+)["']/gi)?.length || 0,
      'data-': response.body.match(/data-[a-z]+=/gi)?.length || 0
    };
    
    console.log('    Patterns found:');
    Object.entries(patterns).forEach(([key, value]) => {
      if (value) {
        console.log(`      ✓ ${key}: ${typeof value === 'boolean' ? 'YES' : value}`);
      }
    });
    
    console.log('\n[3] Searching for M3U8 URLs...');
    
    // Direct M3U8 URLs
    const m3u8Pattern = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g;
    const m3u8Matches = response.body.match(m3u8Pattern);
    
    if (m3u8Matches) {
      console.log(`    ✓ Found ${m3u8Matches.length} direct M3U8 URL(s):`);
      m3u8Matches.slice(0, 3).forEach((url, i) => {
        console.log(`      ${i + 1}. ${url.substring(0, 80)}...`);
      });
    } else {
      console.log('    ✗ No direct M3U8 URLs found');
    }
    
    console.log('\n[4] Searching for video player configs...');
    
    // JWPlayer setup
    const jwSetupPattern = /jwplayer\([^)]+\)\.setup\(([^;]+)\)/gi;
    const jwMatches = [...response.body.matchAll(jwSetupPattern)];
    
    if (jwMatches.length > 0) {
      console.log(`    ✓ Found ${jwMatches.length} JWPlayer setup(s)`);
      jwMatches.forEach((match, i) => {
        console.log(`      ${i + 1}. ${match[0].substring(0, 100)}...`);
      });
    }
    
    // Video.js
    const videojsPattern = /videojs\([^)]+,\s*({[^}]+})/gi;
    const videojsMatches = [...response.body.matchAll(videojsPattern)];
    
    if (videojsMatches.length > 0) {
      console.log(`    ✓ Found ${videojsMatches.length} Video.js config(s)`);
    }
    
    // Generic sources
    const sourcesPattern = /sources?\s*[:=]\s*\[([^\]]+)\]/gi;
    const sourcesMatches = [...response.body.matchAll(sourcesPattern)];
    
    if (sourcesMatches.length > 0) {
      console.log(`    ✓ Found ${sourcesMatches.length} sources array(s)`);
      sourcesMatches.slice(0, 2).forEach((match, i) => {
        console.log(`      ${i + 1}. ${match[0].substring(0, 100)}...`);
      });
    }
    
    console.log('\n[5] Searching for nested iframes...');
    
    const iframePattern = /<iframe[^>]+src=["']([^"']+)["']/gi;
    const iframeMatches = [...response.body.matchAll(iframePattern)];
    
    if (iframeMatches.length > 0) {
      console.log(`    ✓ Found ${iframeMatches.length} iframe(s):`);
      iframeMatches.forEach((match, i) => {
        console.log(`      ${i + 1}. ${match[1]}`);
      });
    } else {
      console.log('    ✗ No iframes found');
    }
    
    console.log('\n[6] Searching for obfuscated code...');
    
    if (response.body.includes('eval(function')) {
      console.log('    ✓ Found eval(function - obfuscated code present');
      
      // Try to extract packed data
      const evalStart = response.body.indexOf('eval(function');
      const functionEnd = response.body.indexOf("}('", evalStart);
      
      if (functionEnd !== -1) {
        const packedStart = functionEnd + 3;
        const packedEnd = response.body.indexOf("',", packedStart);
        const packed = response.body.substring(packedStart, packedEnd);
        
        console.log(`    ✓ Extracted packed data (${packed.length} chars)`);
        console.log(`    ✓ Preview: ${packed.substring(0, 100)}...`);
        
        // Check if it contains video source patterns
        if (packed.includes('hls') || packed.includes('m3u8') || packed.includes('mp4')) {
          console.log('    ✓ Packed data likely contains video sources!');
        }
      }
    } else {
      console.log('    ✗ No obfuscated code found');
    }
    
    console.log('\n[7] Searching for API calls...');
    
    const apiPatterns = [
      /fetch\(["']([^"']+)["']/gi,
      /\$\.ajax\({[^}]*url:\s*["']([^"']+)["']/gi,
      /\$\.get\(["']([^"']+)["']/gi,
      /\$\.post\(["']([^"']+)["']/gi,
      /XMLHttpRequest[^;]+open\([^,]+,\s*["']([^"']+)["']/gi
    ];
    
    let apiFound = false;
    apiPatterns.forEach(pattern => {
      const matches = [...response.body.matchAll(pattern)];
      if (matches.length > 0) {
        apiFound = true;
        console.log(`    ✓ Found ${matches.length} API call(s):`);
        matches.slice(0, 3).forEach((match, i) => {
          console.log(`      ${i + 1}. ${match[1]}`);
        });
      }
    });
    
    if (!apiFound) {
      console.log('    ✗ No obvious API calls found');
    }
    
    console.log('\n[8] Searching for external scripts...');
    
    const scriptPattern = /<script[^>]+src=["']([^"']+)["']/gi;
    const scriptMatches = [...response.body.matchAll(scriptPattern)];
    
    if (scriptMatches.length > 0) {
      console.log(`    ✓ Found ${scriptMatches.length} external script(s):`);
      scriptMatches.slice(0, 5).forEach((match, i) => {
        console.log(`      ${i + 1}. ${match[1]}`);
      });
    }
    
    console.log('\n[9] Checking for data attributes...');
    
    const dataAttrPattern = /data-([a-z-]+)=["']([^"']+)["']/gi;
    const dataMatches = [...response.body.matchAll(dataAttrPattern)];
    
    if (dataMatches.length > 0) {
      const uniqueAttrs = [...new Set(dataMatches.map(m => m[1]))];
      console.log(`    ✓ Found ${uniqueAttrs.length} unique data attribute(s):`);
      uniqueAttrs.slice(0, 10).forEach((attr, i) => {
        console.log(`      ${i + 1}. data-${attr}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    
    return {
      success: true,
      filename,
      patterns,
      m3u8Count: m3u8Matches?.length || 0,
      iframeCount: iframeMatches?.length || 0,
      hasObfuscation: response.body.includes('eval(function'),
      scriptCount: scriptMatches?.length || 0
    };
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('\n' + '#'.repeat(80));
  console.log('COMPREHENSIVE 2EMBED PLAYER ANALYSIS');
  console.log('#'.repeat(80));
  
  const players = [
    {
      name: 'Fight Club - streamsrcs.2embed.cc',
      url: 'https://streamsrcs.2embed.cc/swish?id=1lzngys5exf9',
      referer: 'https://cloudnestra.com/'
    },
    {
      name: 'The Office - player4u.xyz (failed)',
      url: 'https://player4u.xyz/embed?key=The Office S01E01',
      referer: 'https://cloudnestra.com/'
    },
    {
      name: 'Better Call Saul - player4u.xyz (working)',
      url: 'https://player4u.xyz/embed?key=Better Call Saul S06E02',
      referer: 'https://cloudnestra.com/'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    
    console.log(`\n\n${'#'.repeat(80)}`);
    console.log(`PLAYER ${i + 1}/${players.length}`);
    console.log(`${'#'.repeat(80)}\n`);
    
    const result = await analyzePlayer(player.url, player.name, player.referer);
    results.push({
      name: player.name,
      ...result
    });
    
    if (i < players.length - 1) {
      console.log(`\n⏳ Waiting 3s before next analysis...`);
      await sleep(3000);
    }
  }
  
  // Summary
  console.log('\n\n' + '#'.repeat(80));
  console.log('ANALYSIS SUMMARY');
  console.log('#'.repeat(80) + '\n');
  
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.name}`);
    if (result.success) {
      console.log(`   File: ${result.filename}`);
      console.log(`   M3U8 URLs: ${result.m3u8Count}`);
      console.log(`   Iframes: ${result.iframeCount}`);
      console.log(`   Obfuscated: ${result.hasObfuscation ? 'YES' : 'NO'}`);
      console.log(`   Scripts: ${result.scriptCount}`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });
  
  console.log('#'.repeat(80) + '\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzePlayer };
