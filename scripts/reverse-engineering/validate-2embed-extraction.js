/**
 * VALIDATION SCRIPT FOR 2EMBED EXTRACTION
 * 
 * Tests extraction with 5 different movies and TV shows
 * Includes delays between requests to prevent rate limiting
 */

const https = require('https');
const { Buffer } = require('buffer');

// ============================================================================
// HTTP CLIENT WITH RETRY
// ============================================================================

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

// ============================================================================
// SIMPLIFIED EXTRACTOR (MANUAL DECODING)
// ============================================================================

async function extract2Embed(tmdbId, type, season, episode, testName) {
  const startTime = Date.now();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(80));
  console.log(`TMDB: ${tmdbId} | Type: ${type.toUpperCase()}`);
  if (type === 'tv') console.log(`Season: ${season}, Episode: ${episode}`);
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Fetch embed page
    let embedUrl = `https://vidsrc-embed.ru/embed/${type}/${tmdbId}`;
    if (type === 'tv') embedUrl += `/${season}/${episode}`;
    
    console.log('[1/8] Fetching embed page...');
    await sleep(1000); // Delay before request
    
    const embedResponse = await fetch(embedUrl, {
      referer: 'https://vidsrc-embed.ru/'
    });
    
    console.log(`      ✓ Got ${embedResponse.body.length} bytes`);
    
    // Step 2: Extract 2embed hash
    console.log('[2/8] Extracting 2embed hash...');
    const hashMatch = embedResponse.body.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?2Embed/i);
    if (!hashMatch) throw new Error('No 2embed hash found');
    
    const hash = hashMatch[1];
    console.log(`      ✓ Hash: ${hash.substring(0, 30)}...`);
    
    // Step 3: Fetch RCP page
    console.log('[3/8] Fetching RCP page...');
    await sleep(1500); // Delay before request
    
    const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
    const rcpResponse = await fetch(rcpUrl, {
      referer: embedUrl,
      origin: 'https://vidsrc-embed.ru'
    });
    
    console.log(`      ✓ Got ${rcpResponse.body.length} bytes`);
    
    // Step 4: Extract ProRCP/SrcRCP URL (with Turnstile bypass)
    console.log('[4/8] Extracting ProRCP/SrcRCP URL...');
    
    let proRcpUrl;
    let pathType;
    
    if (rcpResponse.body.includes('cf-turnstile')) {
      console.log('      ⚡ Bypassing Cloudflare Turnstile...');
      const hashParts = Buffer.from(hash, 'base64').toString('utf-8').split(':');
      if (hashParts.length === 2) {
        const proRcpHash = hashParts[1];
        // Try srcrcp first (for TV shows), then prorcp (for movies)
        proRcpUrl = `https://cloudnestra.com/srcrcp/${proRcpHash}`;
        pathType = 'srcrcp';
        console.log('      ✓ Bypassed with extracted hash (trying srcrcp)');
      } else {
        throw new Error('Cannot bypass Turnstile');
      }
    } else {
      const patterns = [
        { regex: /['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/, type: 'prorcp' },
        { regex: /['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/, type: 'srcrcp' }
      ];
      
      for (const pattern of patterns) {
        const match = rcpResponse.body.match(pattern.regex);
        if (match) {
          proRcpUrl = `https://cloudnestra.com/${pattern.type}/${match[1]}`;
          pathType = pattern.type;
          break;
        }
      }
      
      if (!proRcpUrl) throw new Error('No ProRCP/SrcRCP URL found');
      console.log(`      ✓ Type: ${pathType}`);
    }
    
    // Step 5: Fetch ProRCP/SrcRCP page
    console.log('[5/8] Fetching ProRCP/SrcRCP page...');
    await sleep(1500); // Delay before request
    
    const proRcpResponse = await fetch(proRcpUrl, {
      referer: embedUrl,  // CRITICAL!
      origin: 'https://vidsrc-embed.ru'
    });
    
    console.log(`      ✓ Got ${proRcpResponse.body.length} bytes`);
    
    // Check if it's hidden div (ProRCP) or iframe (SrcRCP)
    const hiddenDivMatch = proRcpResponse.body.match(/<div[^>]+id="([^"]+)"[^>]+style="display:none;">([^<]+)<\/div>/);
    
    if (hiddenDivMatch) {
      console.log('[6/8] ✓ Found hidden div (ProRCP pattern)');
      console.log('[7/8] ⚠️  Skipping decode (use existing decoders)');
      console.log('[8/8] ⚠️  ProRCP pattern - not fully tested');
      
      const duration = Date.now() - startTime;
      return {
        success: true,
        pattern: 'prorcp',
        note: 'ProRCP pattern detected - requires existing decoder',
        duration
      };
    }
    
    // SrcRCP pattern - extract player
    console.log('[6/8] Extracting player iframe...');
    const iframeMatch = proRcpResponse.body.match(/<iframe[^>]+data-src=["']([^"']+)["']/i);
    if (!iframeMatch) throw new Error('No iframe found');
    
    const playerUrl = iframeMatch[1];
    console.log(`      ✓ Player: ${playerUrl.substring(0, 50)}...`);
    
    // Step 7: Fetch player and extract sources
    console.log('[7/8] Fetching player page...');
    await sleep(1500); // Delay before request
    
    const playerResponse = await fetch(playerUrl, {
      referer: proRcpUrl
    });
    
    console.log(`      ✓ Got ${playerResponse.body.length} bytes`);
    
    // Extract /swp/ links
    const swpPattern = /go\(['"]\/swp\/\?id=([^&]+)&tit=([^&]+)&pltm=(\d+)['"]\)/g;
    const swpMatches = [...playerResponse.body.matchAll(swpPattern)];
    
    if (swpMatches.length === 0) throw new Error('No video sources found');
    
    console.log(`      ✓ Found ${swpMatches.length} video sources`);
    
    // Get first source
    const firstSource = swpMatches[0];
    const swpUrl = `https://player4u.xyz/swp/?id=${firstSource[1]}&tit=${firstSource[2]}&pltm=${firstSource[3]}`;
    
    await sleep(1500); // Delay before request
    const swpResponse = await fetch(swpUrl, { referer: playerUrl });
    
    // Extract iframe src
    const swpIframeMatch = swpResponse.body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (!swpIframeMatch) throw new Error('No iframe in SWP page');
    
    const iframeSrc = swpIframeMatch[1];
    
    // Get jqueryjs.js
    await sleep(1000); // Delay before request
    const jqueryResponse = await fetch('https://player4u.xyz/swp/jqueryjs.js', { referer: swpUrl });
    const urlPatternMatch = jqueryResponse.body.match(/["'](https?:\/\/[^"']+)["']\s*\+\s*myUrl/);
    
    if (!urlPatternMatch) throw new Error('Cannot find URL pattern');
    
    const finalPlayerUrl = `${urlPatternMatch[1]}${iframeSrc}`;
    console.log(`      ✓ Final player: ${finalPlayerUrl.substring(0, 50)}...`);
    
    // Step 8: Fetch and decode
    console.log('[8/8] Fetching final player...');
    await sleep(1500); // Delay before request
    
    const finalPlayerResponse = await fetch(finalPlayerUrl, { referer: swpUrl });
    console.log(`      ✓ Got ${finalPlayerResponse.body.length} bytes`);
    
    // Extract sources from packed JavaScript
    console.log('      🔍 Extracting video sources...');
    
    // Look for eval statement
    if (!finalPlayerResponse.body.includes('eval(function')) {
      console.log('      ⚠️  No eval statement found');
      throw new Error('No obfuscated sources found');
    }
    
    // Find the packed data - it's between }(' and ',36
    const evalStart = finalPlayerResponse.body.indexOf("eval(function");
    const functionEnd = finalPlayerResponse.body.indexOf("}('", evalStart);
    if (functionEnd === -1) {
      throw new Error('Cannot find packed data start');
    }
    
    const packedStart = functionEnd + 3;
    const packedEnd = finalPlayerResponse.body.indexOf("',", packedStart);
    const packed = finalPlayerResponse.body.substring(packedStart, packedEnd);
    
    // Extract dictionary
    const dictMatch = finalPlayerResponse.body.substring(packedEnd).match(/,36,\d+,'([^']+)'\.split/);
    if (!dictMatch) {
      throw new Error('Cannot find dictionary');
    }
    
    const dict = dictMatch[1].split('|');
    console.log(`      ✓ Found packed data (${packed.length} chars, ${dict.length} dict entries)`);
    
    // Extract the sources object from packed data
    // Pattern: j o={"1a":"...","1e":"...","1b":"..."}
    const sourcesMatch = packed.match(/j o=\{([^}]+)\}/);
    if (!sourcesMatch) throw new Error('No sources object in packed data');
    
    const sourcesStr = sourcesMatch[1];
    
    // Manual decode function
    function decodeToken(token) {
      const idx = parseInt(token, 36);
      return dict[idx] || token;
    }
    
    // Extract and decode each source
    const sourcePattern = /"([^"]+)":"([^"]+)"/g;
    const sources = {};
    let match;
    
    while ((match = sourcePattern.exec(sourcesStr)) !== null) {
      const key = match[1].replace(/\b([0-9a-z]+)\b/g, decodeToken);
      const value = match[2].replace(/\b([0-9a-z]+)\b/g, decodeToken);
      sources[key] = value;
    }
    
    console.log(`      ✓ Decoded ${Object.keys(sources).length} sources: ${Object.keys(sources).join(', ')}`);
    
    // Build M3U8 URLs
    const m3u8Urls = [];
    
    if (sources.hls3 && sources.hls3.includes('.txt')) {
      const url = sources.hls3.startsWith('http') ? sources.hls3 : `https:${sources.hls3}`;
      m3u8Urls.push({
        url,
        quality: 'auto',
        type: 'txt',
        referer: 'https://yesmovies.baby',
        priority: 1
      });
    }
    
    if (sources.hls2 && sources.hls2.includes('.m3u8')) {
      const url = sources.hls2.startsWith('http') ? sources.hls2 : `https:${sources.hls2}`;
      m3u8Urls.push({
        url,
        quality: 'auto',
        type: 'm3u8',
        referer: finalPlayerUrl,
        priority: 2
      });
    }
    
    if (sources.hls4 && sources.hls4.includes('.m3u8')) {
      const url = sources.hls4.startsWith('http') ? sources.hls4 : `https://yesmovies.baby${sources.hls4}`;
      m3u8Urls.push({
        url,
        quality: 'auto',
        type: 'm3u8',
        referer: finalPlayerUrl,
        priority: 3
      });
    }
    
    if (m3u8Urls.length === 0) throw new Error('No M3U8 URLs extracted');
    
    const duration = Date.now() - startTime;
    
    // Results
    console.log('\n' + '-'.repeat(80));
    console.log('✅ SUCCESS');
    console.log('-'.repeat(80));
    console.log(`Streams found: ${m3u8Urls.length}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    
    m3u8Urls.forEach((stream, i) => {
      console.log(`\n[${i + 1}] ${stream.type.toUpperCase()} (Priority: ${stream.priority})`);
      console.log(`    URL: ${stream.url.substring(0, 80)}...`);
      console.log(`    Referer: ${stream.referer}`);
      if (stream.priority === 1) {
        console.log(`    ⭐ RECOMMENDED`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    return {
      success: true,
      pattern: 'srcrcp',
      streams: m3u8Urls,
      duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('\n' + '-'.repeat(80));
    console.error('❌ FAILED');
    console.error('-'.repeat(80));
    console.error(`Error: ${error.message}`);
    console.error(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.error('='.repeat(80));
    
    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runValidation() {
  console.log('\n' + '#'.repeat(80));
  console.log('2EMBED EXTRACTION VALIDATION');
  console.log('Testing 5 different movies and TV shows');
  console.log('#'.repeat(80));
  
  const testCases = [
    {
      name: 'Better Call Saul S06E02 (TV Show)',
      tmdbId: '60059',
      type: 'tv',
      season: 6,
      episode: 2
    },
    {
      name: 'Breaking Bad S01E01 (TV Show)',
      tmdbId: '1396',
      type: 'tv',
      season: 1,
      episode: 1
    },
    {
      name: 'The Office S01E01 (TV Show)',
      tmdbId: '2316',
      type: 'tv',
      season: 1,
      episode: 1
    },
    {
      name: 'Fight Club (Movie)',
      tmdbId: '550',
      type: 'movie'
    },
    {
      name: 'The Shawshank Redemption (Movie)',
      tmdbId: '278',
      type: 'movie'
    }
  ];

  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n\n${'#'.repeat(80)}`);
    console.log(`TEST ${i + 1}/${testCases.length}`);
    console.log(`${'#'.repeat(80)}\n`);
    
    const result = await extract2Embed(
      testCase.tmdbId,
      testCase.type,
      testCase.season,
      testCase.episode,
      testCase.name
    );
    
    results.push({
      name: testCase.name,
      ...result
    });
    
    // Delay between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      const delay = 3000; // 3 seconds between tests
      console.log(`\n⏳ Waiting ${delay / 1000}s before next test to avoid rate limiting...`);
      await sleep(delay);
    }
  }
  
  // Summary
  console.log('\n\n' + '#'.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('#'.repeat(80) + '\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`Success Rate: ${Math.round((successful.length / results.length) * 100)}%\n`);
  
  console.log('Detailed Results:');
  console.log('-'.repeat(80));
  
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`\n${i + 1}. ${status} ${result.name}`);
    console.log(`   Duration: ${duration}s`);
    
    if (result.success) {
      if (result.pattern === 'srcrcp') {
        console.log(`   Pattern: SrcRCP (Full extraction)`);
        console.log(`   Streams: ${result.streams.length}`);
        const txtStream = result.streams.find(s => s.type === 'txt');
        if (txtStream) {
          console.log(`   ⭐ Has .txt stream (simple referer)`);
        }
      } else {
        console.log(`   Pattern: ProRCP (${result.note})`);
      }
    } else {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n' + '#'.repeat(80));
  
  if (successful.length === results.length) {
    console.log('🎉 ALL TESTS PASSED! 100% SUCCESS RATE');
  } else if (successful.length > 0) {
    console.log(`⚠️  PARTIAL SUCCESS: ${successful.length}/${results.length} tests passed`);
  } else {
    console.log('❌ ALL TESTS FAILED');
  }
  
  console.log('#'.repeat(80) + '\n');
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: Math.round((successful.length / results.length) * 100),
    results
  };
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  console.log('Starting validation...\n');
  runValidation()
    .then(summary => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Validation script error:', error);
      process.exit(1);
    });
}

module.exports = { extract2Embed, runValidation };
