#!/usr/bin/env node

/**
 * COMPLETE 2EMBED VALIDATION - Full extraction flow
 * Tests the entire chain: vidsrc-embed → cloudnestra → player4u/streamsrcs → yesmovies.baby
 * Validates both movies and TV shows work 100%
 */

const https = require('https');
const http = require('http');

// Test cases
const TEST_CASES = {
  movies: [
    { id: 550, title: 'Fight Club', year: 1999 },
    { id: 278, title: 'The Shawshank Redemption', year: 1994 },
    { id: 680, title: 'Pulp Fiction', year: 1994 }
  ],
  tvShows: [
    { id: 1396, season: 1, episode: 1, title: 'Breaking Bad S01E01' },
    { id: 60059, season: 6, episode: 2, title: 'Better Call Saul S06E02' },
    { id: 2316, season: 1, episode: 1, title: 'The Office S01E01' }
  ]
};

/**
 * Fetch with redirects
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      }
    };

    protocol.get(url, reqOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        // Preserve headers when following redirects
        return fetch(redirectUrl, options).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers, finalUrl: url }));
    }).on('error', reject);
  });
}

/**
 * Step 1: Extract 2embed hash from vidsrc-embed
 */
async function extract2embedHash(tmdbId, season = null, episode = null) {
  const url = season !== null
    ? `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`
    : `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;

  const response = await fetch(url, {
    headers: {
      'Referer': 'https://vidsrc-embed.ru/',
      'Origin': 'https://vidsrc-embed.ru/'
    }
  });

  const match = response.body.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?2Embed/i);
  return match ? match[1] : null;
}

/**
 * Step 2: Fetch RCP page and extract prorcp/srcrcp URL
 * DYNAMICALLY detects whether it's prorcp or srcrcp from the response
 */
async function extractRcpUrl(hash, embedUrl) {
  const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
  
  const response = await fetch(rcpUrl, {
    headers: {
      'Referer': embedUrl,
      'Origin': 'https://vidsrc-embed.ru'
    }
  });

  if (response.statusCode !== 200) {
    throw new Error(`RCP page returned ${response.statusCode}`);
  }

  // Debug: Save RCP response
  const fs = require('fs');
  const debugFile = `debug-rcp-response-${Date.now()}.html`;
  fs.writeFileSync(debugFile, response.body);

  // Try BOTH patterns - let the response tell us which one it is
  const patterns = [
    { regex: /['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/, type: 'prorcp' },
    { regex: /['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/, type: 'srcrcp' }
  ];

  for (const pattern of patterns) {
    const match = response.body.match(pattern.regex);
    if (match) {
      return `https://cloudnestra.com/${pattern.type}/${match[1]}`;
    }
  }

  // Try to bypass Turnstile by decoding hash
  try {
    const decoded = Buffer.from(hash, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length > 1) {
      // Check which endpoint is in the response
      if (response.body.includes('prorcp')) {
        return `https://cloudnestra.com/prorcp/${parts[1]}`;
      } else if (response.body.includes('srcrcp')) {
        return `https://cloudnestra.com/srcrcp/${parts[1]}`;
      }
    }
  } catch {}

  throw new Error('No prorcp/srcrcp URL found in RCP response');
}

/**
 * Step 3: Decode JWPlayer config directly from srcrcp/prorcp
 * The srcrcp URL redirects to 2embed.cc which contains an iframe to the actual player
 */
async function decodeFromRcpPage(rcpUrl, embedUrl) {
  const response = await fetch(rcpUrl, {
    headers: {
      'Referer': embedUrl,
      'Origin': 'https://vidsrc-embed.ru'
    }
  });

  // Check if we got Cloudflare challenge
  if (response.body.includes('Cloudflare') || response.body.includes('cf-challenge') || response.body.includes('turnstile')) {
    throw new Error('Cloudflare challenge detected');
  }

  // Recursively follow iframes until we find the JWPlayer config
  return await followIframesUntilJWPlayer(response.body, response.finalUrl || rcpUrl, 0);
}

/**
 * Recursively follow iframes until we find JWPlayer config
 */
async function followIframesUntilJWPlayer(html, referer, depth = 0) {
  const maxDepth = 5;
  
  if (depth > maxDepth) {
    throw new Error('Max iframe depth reached');
  }
  
  // Try to decode JWPlayer from current page
  if (html.includes('eval(function(p,a,c,k,e,d)')) {
    return decodeJWPlayerFromHTML(html);
  }
  
  // Look for iframe
  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch) {
    let iframeUrl = iframeMatch[1];
    
    // Handle relative URLs
    if (!iframeUrl.startsWith('http')) {
      const baseUrl = referer.includes('2embed.cc') ? 'https://www.2embed.cc' : 'https://yesmovies.baby';
      iframeUrl = iframeUrl.startsWith('/') ? `${baseUrl}${iframeUrl}` : `${baseUrl}/${iframeUrl}`;
    }
    
    console.log(`   ${'  '.repeat(depth)}→ Iframe ${depth + 1}: ${iframeUrl.substring(0, 60)}...`);
    
    // Fetch iframe
    const iframeResponse = await fetch(iframeUrl, {
      headers: {
        'Referer': referer,
        'Origin': new URL(referer).origin
      }
    });
    
    // Recursively check iframe content
    return await followIframesUntilJWPlayer(iframeResponse.body, iframeUrl, depth + 1);
  }
  
  // No iframe and no JWPlayer config
  const fs = require('fs');
  const debugFile = `debug-no-jwplayer-${Date.now()}.html`;
  fs.writeFileSync(debugFile, html);
  throw new Error(`No JWPlayer config or iframe found (saved to ${debugFile})`);
}

  // Debug: Save response
  const fs = require('fs');
  const debugFile = `debug-rcp-${Date.now()}.html`;
  fs.writeFileSync(debugFile, response.body);
  
  return decodeJWPlayerFromHTML(response.body);
}

/**
 * Decode JWPlayer config from HTML
 */
function decodeJWPlayerFromHTML(html) {
  // Extract eval statement - the page contains the JWPlayer config!
  const evalStart = html.indexOf("eval(function(p,a,c,k,e,d)");
  if (evalStart === -1) {
    // Debug: Save response
    const fs = require('fs');
    const debugFile = `debug-rcp-${Date.now()}.html`;
    fs.writeFileSync(debugFile, html);
    throw new Error(`No JWPlayer config found (saved to ${debugFile})`);
  }
  
  // Find the matching closing parenthesis
  let depth = 0;
  let evalEnd = -1;
  for (let i = evalStart + 4; i < html.length; i++) {
    if (html[i] === '(') depth++;
    if (html[i] === ')') {
      depth--;
      if (depth === 0) {
        evalEnd = i;
        break;
      }
    }
  }
  
  const evalStr = html.substring(evalStart, evalEnd + 1);
  const argsMatch = evalStr.match(/\}\('(.+)',(\d+),(\d+),'(.+)'\.split\('\|'\)\)\)$/);
  if (!argsMatch) {
    throw new Error('Failed to parse eval arguments');
  }
  
  const [, packed, radix, count, dictionaryStr] = argsMatch;
  const dictionary = dictionaryStr.split('|');

  // Decode
  let decoded = packed;
  for (let i = parseInt(count) - 1; i >= 0; i--) {
    if (dictionary[i]) {
      const regex = new RegExp('\\b' + i.toString(parseInt(radix)) + '\\b', 'g');
      decoded = decoded.replace(regex, dictionary[i]);
    }
  }

  // Extract sources object
  const sourcesMatch = decoded.match(/\{[^}]*"hls\d+"[^}]*\}/);
  if (!sourcesMatch) {
    throw new Error('No sources found in decoded config');
  }

  try {
    return JSON.parse(sourcesMatch[0]);
  } catch {
    throw new Error('Failed to parse sources JSON');
  }
}



/**
 * Validate m3u8/txt URL
 */
async function validateStream(url, referer) {
  try {
    const response = await fetch(url, {
      headers: { 'Referer': referer }
    });

    if (response.statusCode !== 200) {
      return { valid: false, error: `HTTP ${response.statusCode}` };
    }

    const body = response.body;
    if (!body.includes('#EXTM3U') && !body.includes('#EXT-X-STREAM-INF')) {
      return { valid: false, error: 'Invalid playlist format' };
    }

    const variants = (body.match(/#EXT-X-STREAM-INF/g) || []).length;
    const segments = (body.match(/#EXTINF/g) || []).length;

    return { valid: true, variants, segments, size: body.length };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Test movie
 */
async function testMovie(movie) {
  console.log(`\n📽️  ${movie.title} (${movie.year})`);
  console.log(`   TMDB ID: ${movie.id}`);

  try {
    // Step 1: Extract 2embed hash
    console.log(`   [1/4] Extracting 2embed hash...`);
    const hash = await extract2embedHash(movie.id);
    if (!hash) throw new Error('No 2embed hash found');
    console.log(`   ✓ Hash: ${hash.substring(0, 20)}...`);

    // Step 2: Extract RCP URL (dynamically detects prorcp/srcrcp)
    console.log(`   [2/4] Extracting RCP URL...`);
    const embedUrl = `https://vidsrc-embed.ru/embed/movie/${movie.id}`;
    const rcpUrl = await extractRcpUrl(hash, embedUrl);
    console.log(`   ✓ RCP URL: ${rcpUrl.substring(0, 60)}...`);
    
    // Step 3: Decode JWPlayer config
    console.log(`   [3/4] Decoding JWPlayer config...`);
    console.log(embedUrl)
    const sources = await decodeFromRcpPage(rcpUrl, embedUrl);
    console.log(`   ✓ Sources: ${Object.keys(sources).join(', ')}`);

    // Step 4: Validate streams
    console.log(`   [4/4] Validating streams...`);
    
    // Prioritize hls3 (.txt)
    if (sources.hls3 && sources.hls3.includes('.txt')) {
      const validation = await validateStream(sources.hls3, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS3 (.txt) working`);
        console.log(`      Variants: ${validation.variants}, Segments: ${validation.segments}`);
        return { success: true, source: 'hls3', url: sources.hls3 };
      }
    }

    // Try hls2
    if (sources.hls2) {
      const validation = await validateStream(sources.hls2, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS2 working`);
        console.log(`      Variants: ${validation.variants}, Segments: ${validation.segments}`);
        return { success: true, source: 'hls2', url: sources.hls2 };
      }
    }

    // Try hls4
    if (sources.hls4) {
      const url = sources.hls4.startsWith('http') ? sources.hls4 : `https://yesmovies.baby${sources.hls4}`;
      const validation = await validateStream(url, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS4 working`);
        console.log(`      Variants: ${validation.variants}, Segments: ${validation.segments}`);
        return { success: true, source: 'hls4', url };
      }
    }

    throw new Error('No valid streams found');

  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test TV show
 */
async function testTVShow(show) {
  console.log(`\n📺 ${show.title}`);
  console.log(`   TMDB ID: ${show.id}`);

  try {
    // Step 1: Extract 2embed hash
    console.log(`   [1/3] Extracting 2embed hash...`);
    const hash = await extract2embedHash(show.id, show.season, show.episode);
    if (!hash) throw new Error('No 2embed hash found');
    console.log(`   ✓ Hash: ${hash.substring(0, 20)}...`);

    // Step 2: Extract RCP URL (dynamically detects prorcp/srcrcp)
    console.log(`   [2/4] Extracting RCP URL...`);
    const embedUrl = `https://vidsrc-embed.ru/embed/tv/${show.id}/${show.season}/${show.episode}`;
    const rcpUrl = await extractRcpUrl(hash, embedUrl);
    console.log(`   ✓ RCP URL: ${rcpUrl.substring(0, 60)}...`);
    
    // Step 3: Decode JWPlayer config
    console.log(`   [3/4] Decoding JWPlayer config...`);
    const sources = await decodeFromRcpPage(rcpUrl, embedUrl);
    console.log(`   ✓ Sources: ${Object.keys(sources).join(', ')}`);

    // Step 4: Validate streams
    console.log(`   [4/4] Validating streams...`);
    
    // Prioritize hls3 (.txt)
    if (sources.hls3 && sources.hls3.includes('.txt')) {
      const validation = await validateStream(sources.hls3, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS3 (.txt) working`);
        console.log(`      Variants: ${validation.variants}, Segments: ${validation.segments}`);
        return { success: true, source: 'hls3', url: sources.hls3 };
      }
    }

    // Try hls2
    if (sources.hls2) {
      const validation = await validateStream(sources.hls2, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS2 working`);
        console.log(`      Variants: ${validation.variants}, Segments: ${validation.segments}`);
        return { success: true, source: 'hls2', url: sources.hls2 };
      }
    }

    // Try hls4
    if (sources.hls4) {
      const url = sources.hls4.startsWith('http') ? sources.hls4 : `https://yesmovies.baby${sources.hls4}`;
      const validation = await validateStream(url, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS4 working`);
        console.log(`      Variants: ${validation.variants}, Segments: ${validation.segments}`);
        return { success: true, source: 'hls4', url };
      }
    }

    throw new Error('No valid streams found');

  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     COMPLETE 2EMBED VALIDATION - FULL EXTRACTION FLOW         ║');
  console.log('║  vidsrc → cloudnestra → player4u/streamsrcs → yesmovies.baby  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const results = {
    movies: { total: 0, success: 0, failed: 0, results: [] },
    tvShows: { total: 0, success: 0, failed: 0, results: [] }
  };

  // Test Movies
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                        TESTING MOVIES                          ');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const movie of TEST_CASES.movies) {
    results.movies.total++;
    const result = await testMovie(movie);
    results.movies.results.push({ ...movie, ...result });
    if (result.success) results.movies.success++;
    else results.movies.failed++;
    await new Promise(r => setTimeout(r, 2000));
  }

  // Test TV Shows
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                       TESTING TV SHOWS                         ');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const show of TEST_CASES.tvShows) {
    results.tvShows.total++;
    const result = await testTVShow(show);
    results.tvShows.results.push({ ...show, ...result });
    if (result.success) results.tvShows.success++;
    else results.tvShows.failed++;
    await new Promise(r => setTimeout(r, 2000));
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      VALIDATION SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  console.log(`\n📽️  MOVIES: ${results.movies.success}/${results.movies.total} (${((results.movies.success/results.movies.total)*100).toFixed(0)}%)`);
  console.log(`📺 TV SHOWS: ${results.tvShows.success}/${results.tvShows.total} (${((results.tvShows.success/results.tvShows.total)*100).toFixed(0)}%)`);
  
  const total = results.movies.total + results.tvShows.total;
  const success = results.movies.success + results.tvShows.success;
  console.log(`\n🎯 OVERALL: ${success}/${total} (${((success/total)*100).toFixed(0)}%)`);

  if (success < total) {
    console.log('\n❌ FAILED TESTS:');
    [...results.movies.results, ...results.tvShows.results]
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.title}: ${r.error}`));
  }

  console.log('\n');
  process.exit(success === total ? 0 : 1);
}

main().catch(console.error);
