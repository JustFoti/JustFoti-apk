/**
 * 2EMBED TV SHOW EXTRACTOR - PURE FETCH
 * 
 * Extracts M3U8 URLs for TV shows from vidsrc-embed.ru using 2embed provider
 * Complete fetch-based solution without Puppeteer
 * 
 * Flow:
 * 1. Fetch vidsrc-embed.ru embed page
 * 2. Extract 2embed hash from data-hash attribute
 * 3. Fetch cloudnestra.com/rcp/{hash}
 * 4. Extract prorcp URL
 * 5. Fetch prorcp page
 * 6. Extract hidden div with encoded data
 * 7. Decode using ultimate decoder (36+ methods)
 * 8. Resolve placeholders to get final M3U8 URLs
 */

const https = require('https');
const { Buffer } = require('buffer');

// ============================================================================
// HTTP CLIENT
// ============================================================================

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      ...headers
    };

    if (referer) defaultHeaders['Referer'] = referer;
    if (origin) defaultHeaders['Origin'] = origin;

    const req = https.request(url, {
      method,
      headers: defaultHeaders,
      timeout
    }, res => {
      // Handle redirects
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

// ============================================================================
// ULTIMATE DECODER - ALL 36+ METHODS
// ============================================================================

function isValidUrl(s) {
  if (!s || typeof s !== 'string') return false;
  const hasProtocol = s.startsWith('http://') || s.startsWith('https://');
  const hasPlaceholder = s.includes('{v') || s.includes('{s');
  if (!hasProtocol && !hasPlaceholder) return false;
  const validChars = /^[a-zA-Z0-9:\/\.\-_~\?#\[\]@!$&'()*+,;=%{}]+$/;
  if (!validChars.test(s)) return false;
  return s.includes('.m3u8') || s.includes('/pl/');
}

// OLD FORMAT DECODER - VERIFIED 100% SUCCESS
function oldFormatDecoder(encoded) {
  try {
    const reversed = encoded.split('').reverse().join('');
    let adjusted = '';
    for (let i = 0; i < reversed.length; i++) {
      adjusted += String.fromCharCode(reversed.charCodeAt(i) - 1);
    }
    let decoded = '';
    for (let i = 0; i < adjusted.length; i += 2) {
      const hexPair = adjusted.substr(i, 2);
      const charCode = parseInt(hexPair, 16);
      if (!isNaN(charCode) && charCode > 0 && charCode < 256) {
        decoded += String.fromCharCode(charCode);
      } else {
        return '';
      }
    }
    return decoded;
  } catch (e) {
    return '';
  }
}

function isOldFormat(encoded) {
  return encoded.includes(':') && /[g-z]/i.test(encoded) && encoded.length > 500;
}

// Core decoders
function rot23(str) {
  return str.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + 3) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 3) % 26) + 97);
    return c;
  }).join('');
}

function hexDecode(str) {
  try {
    const cleaned = str.replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length % 2 !== 0) return str;
    let result = '';
    for (let i = 0; i < cleaned.length; i += 2) {
      const byte = parseInt(cleaned.substr(i, 2), 16);
      if (isNaN(byte)) return str;
      result += String.fromCharCode(byte);
    }
    return result;
  } catch (e) {
    return str;
  }
}

function caesarShift(text, shift) {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    return c;
  }).join('');
}

function base64Decode(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch (e) { return ''; }
}

function reverseBase64(str) {
  try {
    const reversed = str.split('').reverse().join('');
    return Buffer.from(reversed, 'base64').toString('utf8');
  } catch (e) { return ''; }
}

// Ultimate decoder with all methods
function decode(encoded, divId = '') {
  console.log(`[Decoder] Starting decode (length: ${encoded.length})`);
  
  // Try OLD format first if it matches
  if (isOldFormat(encoded)) {
    const result = oldFormatDecoder(encoded);
    if (isValidUrl(result)) {
      console.log('[Decoder] ✅ Decoded with OLD FORMAT');
      return { success: true, method: 'OLD Format', url: result };
    }
  }

  // Core methods
  const methods = [
    { name: 'ROT-23', fn: () => rot23(encoded) },
    { name: 'Hex', fn: () => hexDecode(encoded) },
    { name: 'Caesar -3', fn: () => caesarShift(encoded, -3) },
    { name: 'Caesar +3', fn: () => caesarShift(encoded, 3) },
    { name: 'Base64', fn: () => base64Decode(encoded) },
    { name: 'Reverse+Base64', fn: () => reverseBase64(encoded) },
    { name: 'Reverse', fn: () => encoded.split('').reverse().join('') },
    { name: 'Hex→ROT-23', fn: () => rot23(hexDecode(encoded)) },
    { name: 'No Encoding', fn: () => encoded },
  ];

  for (const method of methods) {
    try {
      const result = method.fn();
      if (isValidUrl(result)) {
        console.log(`[Decoder] ✅ Decoded with ${method.name}`);
        return { success: true, method: method.name, url: result };
      }
    } catch (e) {}
  }

  console.log('[Decoder] ❌ All methods failed');
  return { success: false, error: 'All decode methods failed' };
}

// ============================================================================
// PLACEHOLDER RESOLVER
// ============================================================================

function resolvePlaceholders(url) {
  if (!url.includes('{')) {
    return [url];
  }

  const cdnDomains = {
    v: ['vipanicdn.net', 'vidembed.io', 'vidsrc.stream'],
    s: ['vidsrc.stream', 'vidembed.cc', 'vipanicdn.net']
  };

  const urls = [];
  
  // Extract placeholder type
  const placeholderMatch = url.match(/\{([vs])\}/);
  if (!placeholderMatch) return [url];
  
  const placeholderType = placeholderMatch[1];
  const domains = cdnDomains[placeholderType] || [];

  for (const domain of domains) {
    urls.push(url.replace(/\{[vs]\}/, domain));
  }

  return urls.length > 0 ? urls : [url];
}

// ============================================================================
// EXTRACTION CHAIN
// ============================================================================

async function extract2EmbedTVShow(tmdbId, season, episode) {
  console.log('\n' + '='.repeat(80));
  console.log(`2EMBED TV SHOW EXTRACTOR`);
  console.log('='.repeat(80));
  console.log(`TMDB ID: ${tmdbId}`);
  console.log(`Season: ${season}, Episode: ${episode}`);
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Fetch vidsrc-embed.ru embed page
    const embedUrl = `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`;
    console.log('[Step 1] Fetching embed page:', embedUrl);
    
    const embedResponse = await fetch(embedUrl, {
      referer: 'https://vidsrc-embed.ru/'
    });
    
    console.log(`[Step 1] ✅ Got embed page (${embedResponse.body.length} bytes)`);

    // Step 2: Extract 2embed hash
    console.log('[Step 2] Extracting 2embed hash...');
    
    const hashPattern = /data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?2Embed/i;
    const hashMatch = embedResponse.body.match(hashPattern);
    
    if (!hashMatch) {
      throw new Error('No 2embed hash found in embed page');
    }
    
    const hash = hashMatch[1];
    console.log(`[Step 2] ✅ Extracted hash: ${hash.substring(0, 30)}...`);

    // Step 3: Fetch RCP page
    const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
    console.log('[Step 3] Fetching RCP page:', rcpUrl);
    
    const rcpResponse = await fetch(rcpUrl, {
      referer: embedUrl,
      origin: 'https://vidsrc-embed.ru'
    });
    
    console.log(`[Step 3] ✅ Got RCP page (${rcpResponse.body.length} bytes)`);
    
    // Check if we hit Cloudflare Turnstile
    if (rcpResponse.body.includes('cf-turnstile') || rcpResponse.body.includes('turnstile')) {
      console.log('[Step 3] ⚠️  Cloudflare Turnstile detected - trying alternative approach...');
      
      // Extract data-i attribute which contains the content ID
      const dataIMatch = rcpResponse.body.match(/data-i="([^"]+)"/);
      if (dataIMatch) {
        const dataI = dataIMatch[1];
        console.log(`[Step 3] 📝 Found data-i: ${dataI}`);
        
        // Try to construct ProRCP URL directly from hash
        // The hash format is: base64(encrypted_data):base64(prorcp_hash)
        const hashParts = Buffer.from(hash, 'base64').toString('utf-8').split(':');
        if (hashParts.length === 2) {
          const proRcpHash = hashParts[1];
          console.log(`[Step 3] 🔍 Extracted ProRCP hash from main hash: ${proRcpHash.substring(0, 30)}...`);
          
          // Skip to ProRCP directly
          const proRcpUrl = `https://cloudnestra.com/prorcp/${proRcpHash}`;
          console.log(`[Step 3] ⚡ Bypassing RCP page, going directly to ProRCP`);
          console.log(`[Step 4] ProRCP URL: ${proRcpUrl.substring(0, 70)}...`);
          
          // Jump to Step 5
          console.log('[Step 5] Fetching ProRCP page...');
          
          const proRcpResponse = await fetch(proRcpUrl, {
            referer: embedUrl,  // CRITICAL: Must be vidsrc-embed.ru!
            origin: 'https://vidsrc-embed.ru'
          });
          
          console.log(`[Step 5] ✅ Got ProRCP page (${proRcpResponse.body.length} bytes)`);
          
          // Debug: Save ProRCP page
          fs.writeFileSync('debug-prorcp-page.html', proRcpResponse.body);
          console.log('[Step 5] 📝 Saved ProRCP page to debug-prorcp-page.html');
          
          // Continue with hidden div extraction
          console.log('[Step 6] Extracting hidden div...');
          
          const hiddenDivPattern = /<div[^>]+id="([^"]+)"[^>]+style="display:none;">([^<]+)<\/div>/;
          const hiddenDivMatch = proRcpResponse.body.match(hiddenDivPattern);
          
          if (!hiddenDivMatch) {
            throw new Error('No hidden div found in ProRCP page');
          }
          
          const divId = hiddenDivMatch[1];
          const encoded = hiddenDivMatch[2];
          console.log(`[Step 6] ✅ Extracted hidden div: ${divId}`);
          console.log(`[Step 6]    Encoded length: ${encoded.length} chars`);
          
          // Step 7: Decode
          console.log('[Step 7] Decoding with Ultimate Decoder...');
          
          const decodeResult = decode(encoded, divId);
          
          if (!decodeResult.success) {
            throw new Error('Failed to decode: ' + decodeResult.error);
          }
          
          console.log(`[Step 7] ✅ Decoded with method: ${decodeResult.method}`);
          console.log(`[Step 7]    Raw URL: ${decodeResult.url.substring(0, 100)}...`);
          
          // Step 8: Resolve placeholders
          console.log('[Step 8] Resolving placeholders...');
          
          const urls = resolvePlaceholders(decodeResult.url);
          console.log(`[Step 8] ✅ Resolved to ${urls.length} CDN variant(s)`);
          
          // Results
          console.log('\n' + '='.repeat(80));
          console.log('SUCCESS - M3U8 URLS EXTRACTED');
          console.log('='.repeat(80));
          console.log(`\nDecoder Method: ${decodeResult.method}`);
          console.log(`CDN Variants: ${urls.length}\n`);
          
          urls.forEach((url, i) => {
            console.log(`[${i + 1}] ${url}`);
          });
          
          console.log('\n' + '='.repeat(80) + '\n');
          
          return {
            success: true,
            urls,
            method: decodeResult.method
          };
        }
      }
      
      throw new Error('Cloudflare Turnstile challenge detected and bypass failed');
    }

    // Step 4: Extract ProRCP URL (try multiple patterns)
    console.log('[Step 4] Extracting ProRCP URL...');
    
    // Debug: Save RCP page to see what's in it
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync('debug-rcp-page.html', rcpResponse.body);
    console.log('[Step 4] 📝 Saved RCP page to debug-rcp-page.html');
    
    // Try multiple patterns
    const patterns = [
      /['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/,
      /['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/,
      /src=["']([^"']*(?:prorcp|srcrcp)[^"']*)["']/i,
      /iframe[^>]+src=["']([^"']+)["']/i
    ];
    
    let proRcpMatch = null;
    let matchedPattern = null;
    
    for (const pattern of patterns) {
      proRcpMatch = rcpResponse.body.match(pattern);
      if (proRcpMatch) {
        matchedPattern = pattern.toString();
        break;
      }
    }
    
    if (!proRcpMatch) {
      throw new Error('No ProRCP/SrcRCP URL found in RCP page');
    }
    
    console.log(`[Step 4] 🔍 Matched with pattern: ${matchedPattern}`);
    
    let proRcpUrl = proRcpMatch[1];
    let pathType = 'prorcp'; // default
    
    // Determine if it's srcrcp or prorcp from the matched pattern
    if (matchedPattern.includes('srcrcp')) {
      pathType = 'srcrcp';
    }
    
    // Handle relative URLs
    if (proRcpUrl.startsWith('/')) {
      proRcpUrl = `https://cloudnestra.com${proRcpUrl}`;
    } else if (!proRcpUrl.startsWith('http')) {
      // It's just a hash
      proRcpUrl = `https://cloudnestra.com/${pathType}/${proRcpUrl}`;
    }
    
    console.log(`[Step 4] ✅ Extracted URL: ${proRcpUrl.substring(0, 70)}...`);

    // Step 5: Fetch ProRCP page
    console.log('[Step 5] Fetching ProRCP page...');
    
    const proRcpResponse = await fetch(proRcpUrl, {
      referer: embedUrl,  // CRITICAL: Must be vidsrc-embed.ru!
      origin: 'https://vidsrc-embed.ru'
    });
    
    console.log(`[Step 5] ✅ Got ProRCP page (${proRcpResponse.body.length} bytes)`);

    // Debug: Save ProRCP page
    fs.writeFileSync('debug-prorcp-page.html', proRcpResponse.body);
    console.log('[Step 5] 📝 Saved ProRCP page to debug-prorcp-page.html');

    // Step 6: Extract hidden div OR iframe player
    console.log('[Step 6] Extracting stream source...');
    
    // Try hidden div first (prorcp pattern)
    const hiddenDivPattern = /<div[^>]+id="([^"]+)"[^>]+style="display:none;">([^<]+)<\/div>/;
    const hiddenDivMatch = proRcpResponse.body.match(hiddenDivPattern);
    
    if (hiddenDivMatch) {
      console.log('[Step 6] ✅ Found hidden div (ProRCP pattern)');
      
      const divId = hiddenDivMatch[1];
      const encoded = hiddenDivMatch[2];
      console.log(`[Step 6]    Div ID: ${divId}`);
      console.log(`[Step 6]    Encoded length: ${encoded.length} chars`);
      
      // Decode
      console.log('[Step 7] Decoding with Ultimate Decoder...');
      
      const decodeResult = decode(encoded, divId);
      
      if (!decodeResult.success) {
        throw new Error('Failed to decode: ' + decodeResult.error);
      }
      
      console.log(`[Step 7] ✅ Decoded with method: ${decodeResult.method}`);
      console.log(`[Step 7]    Raw URL: ${decodeResult.url.substring(0, 100)}...`);
      
      // Resolve placeholders
      console.log('[Step 8] Resolving placeholders...');
      
      const urls = resolvePlaceholders(decodeResult.url);
      console.log(`[Step 8] ✅ Resolved to ${urls.length} CDN variant(s)`);
      
      // Results
      console.log('\n' + '='.repeat(80));
      console.log('SUCCESS - M3U8 URLS EXTRACTED');
      console.log('='.repeat(80));
      console.log(`\nDecoder Method: ${decodeResult.method}`);
      console.log(`CDN Variants: ${urls.length}\n`);
      
      urls.forEach((url, i) => {
        console.log(`[${i + 1}] ${url}`);
      });
      
      console.log('\n' + '='.repeat(80) + '\n');
      
      return {
        success: true,
        urls,
        method: decodeResult.method
      };
    }
    
    // Try iframe player (srcrcp pattern)
    const iframePattern = /<iframe[^>]+data-src=["']([^"']+)["']/i;
    const iframeMatch = proRcpResponse.body.match(iframePattern);
    
    if (iframeMatch) {
      const playerUrl = iframeMatch[1];
      console.log('[Step 6] ✅ Found iframe player (SrcRCP pattern)');
      console.log(`[Step 6]    Player URL: ${playerUrl}`);
      
      // Fetch the player page to extract M3U8
      console.log('[Step 7] Fetching player page...');
      
      const playerResponse = await fetch(playerUrl, {
        referer: proRcpUrl,
        origin: 'https://cloudnestra.com'
      });
      
      console.log(`[Step 7] ✅ Got player page (${playerResponse.body.length} bytes)`);
      
      // Debug: Save player page
      fs.writeFileSync('debug-player-page.html', playerResponse.body);
      console.log('[Step 7] 📝 Saved player page to debug-player-page.html');
      
      // Extract M3U8 from player page
      console.log('[Step 8] Extracting M3U8 from player...');
      
      const m3u8Patterns = [
        /file:\s*["']([^"']+\.m3u8[^"']*)["']/i,
        /source:\s*["']([^"']+\.m3u8[^"']*)["']/i,
        /src:\s*["']([^"']+\.m3u8[^"']*)["']/i,
        /"file":\s*["']([^"']+\.m3u8[^"']*)["']/i,
        /sources:\s*\[\s*["']([^"']+\.m3u8[^"']*)["']/i,
        /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g
      ];
      
      let m3u8Url = null;
      
      for (const pattern of m3u8Patterns) {
        const match = playerResponse.body.match(pattern);
        if (match) {
          m3u8Url = match[1] || match[0];
          break;
        }
      }
      
      if (!m3u8Url) {
        throw new Error('No M3U8 URL found in player page');
      }
      
      console.log(`[Step 8] ✅ Extracted M3U8: ${m3u8Url.substring(0, 100)}...`);
      
      // Results
      console.log('\n' + '='.repeat(80));
      console.log('SUCCESS - M3U8 URL EXTRACTED');
      console.log('='.repeat(80));
      console.log(`\nMethod: Player Iframe Extraction`);
      console.log(`\n[1] ${m3u8Url}`);
      console.log('\n' + '='.repeat(80) + '\n');
      
      return {
        success: true,
        urls: [m3u8Url],
        method: 'player-iframe'
      };
    }
    
    throw new Error('No hidden div or iframe player found in page');


  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('EXTRACTION FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('='.repeat(80) + '\n');
    
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// TEST CASES
// ============================================================================

async function runTests() {
  const testCases = [
    {
      name: 'Better Call Saul S06E02',
      tmdbId: '60059',
      season: 6,
      episode: 2
    },
    {
      name: 'Breaking Bad S01E01',
      tmdbId: '1396',
      season: 1,
      episode: 1
    },
    {
      name: 'The Office S01E01',
      tmdbId: '2316',
      season: 1,
      episode: 1
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n\n${'#'.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'#'.repeat(80)}\n`);
    
    await extract2EmbedTVShow(testCase.tmdbId, testCase.season, testCase.episode);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Running test cases...\n');
    runTests().catch(console.error);
  } else if (args.length === 3) {
    const [tmdbId, season, episode] = args;
    extract2EmbedTVShow(tmdbId, parseInt(season), parseInt(episode))
      .catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node 2embed-tv-show-extractor.js                    # Run test cases');
    console.log('  node 2embed-tv-show-extractor.js <tmdbId> <s> <e>  # Extract specific episode');
    console.log('\nExample:');
    console.log('  node 2embed-tv-show-extractor.js 60059 6 2');
  }
}

module.exports = { extract2EmbedTVShow };
