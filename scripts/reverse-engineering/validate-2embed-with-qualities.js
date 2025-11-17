#!/usr/bin/env node

/**
 * 2EMBED VALIDATION WITH QUALITY PICKER
 * Extracts multiple quality options from player4u
 */

const https = require('https');
const http = require('http');

const TEST_MOVIE = { tmdbId: 550, imdbId: 'tt0137523', title: 'Fight Club' };

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
 * Extract and categorize quality options
 */
function extractQualityOptions(html) {
  const qualityMatches = [...html.matchAll(/go\('([^']+)'\)/g)];
  
  const qualities = {
    '2160p': [],
    '1080p': [],
    '720p': [],
    '480p': [],
    'other': []
  };

  for (const match of qualityMatches) {
    const url = match[1];
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('2160p') || urlLower.includes('4k') || urlLower.includes('uhd')) {
      qualities['2160p'].push(url);
    } else if (urlLower.includes('1080p')) {
      qualities['1080p'].push(url);
    } else if (urlLower.includes('720p')) {
      qualities['720p'].push(url);
    } else if (urlLower.includes('480p')) {
      qualities['480p'].push(url);
    } else {
      qualities['other'].push(url);
    }
  }

  return qualities;
}

/**
 * Pick best option from each quality
 */
function pickBestFromEachQuality(qualities) {
  const selected = [];

  for (const [quality, urls] of Object.entries(qualities)) {
    if (urls.length === 0) continue;

    // Prefer non-dubbed, non-Hindi versions
    let best = urls.find(url => {
      const lower = url.toLowerCase();
      return !lower.includes('hindi') && !lower.includes('dual') && !lower.includes('hin-eng');
    });

    // Fallback to first option
    if (!best) best = urls[0];

    selected.push({ quality, url: best });
  }

  return selected;
}

/**
 * Decode JWPlayer from HTML
 */
function decodeJWPlayer(html) {
  const evalStart = html.indexOf("eval(function(p,a,c,k,e,d)");
  if (evalStart === -1) return null;
  
  let depth = 0, evalEnd = -1;
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
  if (!argsMatch) return null;
  
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
  if (!sourcesMatch) return null;

  try {
    return JSON.parse(sourcesMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Follow iframes recursively
 */
async function followIframes(html, referer, depth = 0) {
  if (depth > 5) return null;
  
  if (html.includes('eval(function(p,a,c,k,e,d)')) {
    return decodeJWPlayer(html);
  }
  
  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch) {
    let iframeUrl = iframeMatch[1];
    
    if (!iframeUrl.startsWith('http')) {
      const baseUrl = referer.includes('2embed.cc') ? 'https://www.2embed.cc' : 'https://yesmovies.baby';
      iframeUrl = iframeUrl.startsWith('/') ? `${baseUrl}${iframeUrl}` : `${baseUrl}/${iframeUrl}`;
    }
    
    const iframeResponse = await fetch(iframeUrl, {
      headers: {
        'Referer': referer,
        'Origin': new URL(referer).origin
      }
    });
    
    return await followIframes(iframeResponse.body, iframeUrl, depth + 1);
  }
  
  return null;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        2EMBED QUALITY PICKER - EXTRACT ALL QUALITIES          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const movie = TEST_MOVIE;
  console.log(`\n📽️  ${movie.title} (${movie.imdbId})\n`);

  // Step 1: Get 2embed.cc page
  console.log('[1/5] Fetching 2embed.cc page...');
  const embedUrl = `https://www.2embed.cc/embed/${movie.imdbId}`;
  const embedResponse = await fetch(embedUrl);
  console.log(`✓ Got page (${embedResponse.body.length} bytes)`);

  // Step 2: Extract player4u URL
  console.log('\n[2/5] Extracting player4u URL...');
  const serverMatches = [...embedResponse.body.matchAll(/onclick="go\('([^']+)'\)"/g)];
  const player4uUrl = serverMatches.find(m => m[1].includes('player4u'))?.[1];
  
  if (!player4uUrl) {
    console.log('❌ No player4u URL found');
    return;
  }
  console.log(`✓ Found: ${player4uUrl}`);

  // Step 3: Get player4u page and extract qualities
  console.log('\n[3/5] Fetching player4u page and extracting qualities...');
  const player4uResponse = await fetch(player4uUrl, {
    headers: { 'Referer': embedUrl }
  });
  console.log(`✓ Got page (${player4uResponse.body.length} bytes)`);

  const qualities = extractQualityOptions(player4uResponse.body);
  console.log('\n📊 Quality Distribution:');
  for (const [quality, urls] of Object.entries(qualities)) {
    if (urls.length > 0) {
      console.log(`   ${quality}: ${urls.length} options`);
    }
  }

  const selected = pickBestFromEachQuality(qualities);
  console.log(`\n✓ Selected ${selected.length} quality options`);

  // Step 4: Fetch each quality and extract streams
  console.log('\n[4/5] Fetching streams for each quality...\n');
  
  const results = [];
  
  for (const { quality, url } of selected) {
    console.log(`📹 ${quality}:`);
    console.log(`   URL: ${url.substring(0, 80)}...`);
    
    try {
      const swpUrl = `https://player4u.xyz${url}`;
      const swpResponse = await fetch(swpUrl, {
        headers: { 'Referer': player4uUrl }
      });
      
      // Extract iframe src from swp page
      const iframeMatch = swpResponse.body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (!iframeMatch) {
        console.log(`   ❌ No iframe found in swp page`);
        continue;
      }
      
      const iframeId = iframeMatch[1];
      const yesmoviesUrl = `https://yesmovies.baby/e/${iframeId}`;
      console.log(`   → Yesmovies URL: ${yesmoviesUrl}`);
      
      // Fetch yesmovies.baby page
      const yesmoviesResponse = await fetch(yesmoviesUrl, {
        headers: { 'Referer': swpUrl }
      });
      
      const sources = decodeJWPlayer(yesmoviesResponse.body);
      
      if (sources) {
        console.log(`   ✅ SUCCESS!`);
        console.log(`      Sources: ${Object.keys(sources).join(', ')}`);
        
        // Prefer hls3 (.txt)
        const streamUrl = sources.hls3 || sources.hls2 || sources.hls4;
        if (streamUrl) {
          console.log(`      Stream: ${streamUrl.substring(0, 80)}...`);
          results.push({ quality, sources, streamUrl });
        }
      } else {
        console.log(`   ❌ No sources found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
    await new Promise(r => setTimeout(r, 1000));
  }

  // Step 5: Summary
  console.log('\n[5/5] Summary\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    EXTRACTION RESULTS                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ Successfully extracted ${results.length} quality options:\n`);
  
  for (const { quality, streamUrl } of results) {
    console.log(`   ${quality}: ${streamUrl}`);
  }

  console.log('\n');
}

main().catch(console.error);
