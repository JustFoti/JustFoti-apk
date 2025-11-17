#!/usr/bin/env node

/**
 * DIRECT 2EMBED VALIDATION - Skip vidsrc-embed entirely!
 * Go directly to 2embed.cc with IMDB ID
 */

const https = require('https');
const http = require('http');

// Test cases with IMDB IDs
const TEST_CASES = {
  movies: [
    { tmdbId: 550, imdbId: 'tt0137523', title: 'Fight Club' },
    { tmdbId: 278, imdbId: 'tt0111161', title: 'The Shawshank Redemption' },
    { tmdbId: 680, imdbId: 'tt0110912', title: 'Pulp Fiction' }
  ],
  tvShows: [
    { tmdbId: 1396, imdbId: 'tt0903747', season: 1, episode: 1, title: 'Breaking Bad S01E01' },
    { tmdbId: 60059, imdbId: 'tt3032476', season: 6, episode: 2, title: 'Better Call Saul S06E02' },
    { tmdbId: 2316, imdbId: 'tt0386676', season: 1, episode: 1, title: 'The Office S01E01' }
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
        return fetch(redirectUrl, options).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, finalUrl: url }));
    }).on('error', reject);
  });
}

/**
 * Extract player4u URL from myDropdown div
 */
function extractPlayer4uUrl(html) {
  // Look for player4u in the server list
  const player4uMatch = html.match(/data-id=["']([^"']*player4u[^"']*)["']/i);
  if (player4uMatch) {
    return player4uMatch[1];
  }
  
  // Alternative: look for any data-id with a URL
  const dataIdMatches = html.matchAll(/data-id=["']([^"']+)["']/g);
  for (const match of dataIdMatches) {
    if (match[1].includes('player4u') || match[1].includes('yesmovies')) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Decode JWPlayer config from HTML
 */
function decodeJWPlayerFromHTML(html) {
  const evalStart = html.indexOf("eval(function(p,a,c,k,e,d)");
  if (evalStart === -1) {
    throw new Error('No JWPlayer config found');
  }
  
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

  let decoded = packed;
  for (let i = parseInt(count) - 1; i >= 0; i--) {
    if (dictionary[i]) {
      const regex = new RegExp('\\b' + i.toString(parseInt(radix)) + '\\b', 'g');
      decoded = decoded.replace(regex, dictionary[i]);
    }
  }

  const sourcesMatch = decoded.match(/\{[^}]*"hls\d+"[^}]*\}/);
  if (!sourcesMatch) {
    throw new Error('No sources found in decoded config');
  }

  return JSON.parse(sourcesMatch[0]);
}

/**
 * Recursively follow iframes until we find JWPlayer config
 */
async function followIframesUntilJWPlayer(html, referer, depth = 0) {
  if (depth > 5) {
    throw new Error('Max iframe depth reached');
  }
  
  if (html.includes('eval(function(p,a,c,k,e,d)')) {
    return decodeJWPlayerFromHTML(html);
  }
  
  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch) {
    let iframeUrl = iframeMatch[1];
    
    if (!iframeUrl.startsWith('http')) {
      const baseUrl = referer.includes('2embed.cc') ? 'https://www.2embed.cc' : 'https://yesmovies.baby';
      iframeUrl = iframeUrl.startsWith('/') ? `${baseUrl}${iframeUrl}` : `${baseUrl}/${iframeUrl}`;
    }
    
    console.log(`   ${'  '.repeat(depth)}→ Iframe ${depth + 1}: ${iframeUrl.substring(0, 70)}...`);
    
    const iframeResponse = await fetch(iframeUrl, {
      headers: {
        'Referer': referer,
        'Origin': new URL(referer).origin
      }
    });
    
    return await followIframesUntilJWPlayer(iframeResponse.body, iframeUrl, depth + 1);
  }
  
  throw new Error('No JWPlayer config or iframe found');
}

/**
 * Validate stream URL
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
    if (!body.includes('#EXTM3U')) {
      return { valid: false, error: 'Not a valid m3u8 file' };
    }

    const variants = (body.match(/#EXT-X-STREAM-INF/g) || []).length;
    const segments = (body.match(/#EXTINF/g) || []).length;

    return { valid: true, variants, segments };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Test movie
 */
async function testMovie(movie) {
  console.log(`\n📽️  ${movie.title}`);
  console.log(`   IMDB: ${movie.imdbId}`);

  try {
    // Step 1: Go directly to 2embed.cc with IMDB ID
    console.log(`   [1/3] Fetching 2embed.cc page...`);
    const embedUrl = `https://www.2embed.cc/embed/${movie.imdbId}`;
    const embedResponse = await fetch(embedUrl);
    console.log(`   ✓ Got 2embed.cc page (${embedResponse.body.length} bytes)`);

    // DEBUG: Save the HTML to inspect it
    const fs = require('fs');
    const debugFile = `debug-2embed-${movie.imdbId}.html`;
    fs.writeFileSync(debugFile, embedResponse.body);
    console.log(`   → Saved to ${debugFile}`);

    // Step 2: Extract server URLs from myDropdown
    console.log(`   [2/3] Extracting server URLs from myDropdown...`);
    
    // Extract onclick="go('URL')" patterns
    const serverMatches = [...embedResponse.body.matchAll(/onclick="go\('([^']+)'\)"/g)];
    console.log(`   → Found ${serverMatches.length} servers`);
    
    let player4uUrl = null;
    for (const match of serverMatches) {
      const url = match[1];
      console.log(`      - ${url}`);
      
      if (url.includes('player4u')) {
        player4uUrl = url;
      }
    }
    
    if (!player4uUrl) {
      throw new Error('No player4u URL found');
    }
    
    console.log(`   ✓ Using player4u: ${player4uUrl}`);

    // Step 3: Fetch player4u page and extract quality options
    console.log(`   [3/4] Fetching player4u page...`);
    const player4uResponse = await fetch(player4uUrl, {
      headers: {
        'Referer': embedUrl
      }
    });
    console.log(`   ✓ Got player4u page (${player4uResponse.body.length} bytes)`);

    // DEBUG: Save player4u HTML
    fs.writeFileSync(`debug-player4u-${movie.imdbId}.html`, player4uResponse.body);
    console.log(`   → Saved to debug-player4u-${movie.imdbId}.html`);

    // Extract quality options from go() calls
    const qualityMatches = [...player4uResponse.body.matchAll(/go\('([^']+)'\)/g)];
    console.log(`   → Found ${qualityMatches.length} quality options`);
    
    for (const match of qualityMatches) {
      console.log(`      - ${match[1]}`);
    }
    
    throw new Error('STOP TO INSPECT PLAYER4U HTML');

    // Step 3: Validate streams
    console.log(`   [3/3] Validating streams...`);
    
    if (sources.hls3 && sources.hls3.includes('.txt')) {
      const validation = await validateStream(sources.hls3, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS3 working (${validation.variants} variants, ${validation.segments} segments)`);
        return { success: true, source: 'hls3', url: sources.hls3 };
      }
    }

    if (sources.hls2) {
      const validation = await validateStream(sources.hls2, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS2 working (${validation.variants} variants, ${validation.segments} segments)`);
        return { success: true, source: 'hls2', url: sources.hls2 };
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
  console.log(`   IMDB: ${show.imdbId}`);

  try {
    // Step 1: Go directly to 2embed.cc with IMDB ID
    console.log(`   [1/3] Fetching 2embed.cc page...`);
    const embedUrl = `https://www.2embed.cc/embedtv/${show.imdbId}&s=${show.season}&e=${show.episode}`;
    const embedResponse = await fetch(embedUrl);
    console.log(`   ✓ Got 2embed.cc page`);

    // Step 2: Follow iframes to get JWPlayer config
    console.log(`   [2/3] Following iframes to player...`);
    const sources = await followIframesUntilJWPlayer(embedResponse.body, embedUrl);
    console.log(`   ✓ Sources: ${Object.keys(sources).join(', ')}`);

    // Step 3: Validate streams
    console.log(`   [3/3] Validating streams...`);
    
    if (sources.hls3 && sources.hls3.includes('.txt')) {
      const validation = await validateStream(sources.hls3, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS3 working (${validation.variants} variants, ${validation.segments} segments)`);
        return { success: true, source: 'hls3', url: sources.hls3 };
      }
    }

    if (sources.hls2) {
      const validation = await validateStream(sources.hls2, 'https://yesmovies.baby');
      if (validation.valid) {
        console.log(`   ✅ SUCCESS! HLS2 working (${validation.variants} variants, ${validation.segments} segments)`);
        return { success: true, source: 'hls2', url: sources.hls2 };
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
  console.log('║          DIRECT 2EMBED VALIDATION - SKIP VIDSRC!              ║');
  console.log('║         Go directly to 2embed.cc with IMDB ID                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const results = {
    movies: { total: 0, success: 0, results: [] },
    tvShows: { total: 0, success: 0, results: [] }
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
    await new Promise(r => setTimeout(r, 2000));
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      VALIDATION SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const movieRate = (results.movies.success / results.movies.total * 100).toFixed(0);
  const tvRate = (results.tvShows.success / results.tvShows.total * 100).toFixed(0);
  const total = results.movies.total + results.tvShows.total;
  const success = results.movies.success + results.tvShows.success;
  const overallRate = (success / total * 100).toFixed(0);

  console.log(`\n📽️  MOVIES: ${results.movies.success}/${results.movies.total} (${movieRate}%)`);
  console.log(`📺 TV SHOWS: ${results.tvShows.success}/${results.tvShows.total} (${tvRate}%)`);
  console.log(`\n🎯 OVERALL: ${success}/${total} (${overallRate}%)`);

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
