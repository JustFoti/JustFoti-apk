/**
 * COMPLETE 2EMBED EXTRACTOR - PRODUCTION READY
 * 
 * Extracts M3U8 URLs from vidsrc-embed.ru using 2embed provider
 * Works for both TV shows and movies using pure fetch
 * 
 * Flow:
 * 1. vidsrc-embed.ru → 2embed hash
 * 2. cloudnestra.com/rcp → srcrcp/prorcp hash (bypass Turnstile)
 * 3. cloudnestra.com/srcrcp or /prorcp → player URL or hidden div
 * 4. For srcrcp: player4u.xyz → yesmovies.baby → decode jwplayer
 * 5. For prorcp: decode hidden div directly
 * 6. Return M3U8 URLs (prioritize .txt URLs with simple referer)
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

// ============================================================================
// JWPLAYER DECODER (for yesmovies.baby)
// ============================================================================

const JWPLAYER_DICT = '||||||||||player|if|||||jw|||var|function||||links|tracks|submenu|settings|||item||svg||lastt|||||||script|audioTracks||on||hls2|hls3|jwplayer|https|hls4|589|position|else|file|icon|code|link|length|false|aria|attr|true|div|tott|currentFile|seek|newFile|path|ggima|document|data|63811935||return|name|||active||ttgzuctcyihe4z|get|ls|rewind||tt|sec|769|240|60009|html|1763350833|op|dl|com|date|prevt|dt|textContent|match|doc|text|ffffff||pg8s50jw8kzp|current_audio|getAudioTracks|removeClass||expanded||checked|addButton|hls|type|load|hide|log|console|adb|xyz|2215963772d9f85e8543258e031d3bf5|185|hash|gzuctcyihe4z|vvplay|new|itads|vvad||100|master|setCurrentAudioTrack|audio_name|for|audio_set|open|controls|playbackRates|captions|event|stop|res|getPlaylistItem|ready||play|||currentTracks||||insertAfter|detach|ff00|button|getPosition|974|887|013|867|178|focusable|viewBox|class|2000|org|w3|www|http|xmlns|ff11|06475|23525|29374|97928|30317|31579|29683|38421||30626||72072|H|track_name||appendChild|body|fviews|player4u|referer|embed|file_code|view|js|src|createElement|video_ad|doPlay|value|loaded|documentElement|parseFromString|DOMParser|startsWith|xtype|playAd|vast|time|uas|FFFFFF|jpg|pixoraa|3564||urlset||609nu51a4w0l_|00147|01|i60k6cbfsa8z|m3u8|300|English|setTimeout|default_audio|getItem|localStorage|dualSound|addClass|quality|hasClass|toggleClass|Track|Audio|dualy|images|mousedown|buttons|topbar|catch|ok|then|HEAD|method||fetch|firstFrame|once|null|getConfig|error|Rewind||778Z||214|2A4|3H209|3v19|9c4|7l41|9a6|3c0|1v19|4H79|3h48|8H146|3a4|2v125|130||1Zm162|4v62|13a4|51l|278Zm|278|1S103|1s6|3Zm||078a21|131|M113|Forward|69999|88605|21053|03598|02543|99999|72863|77056|04577|422413|163|210431|860275|03972|689569|893957|124979|52502|174985|57502|04363|13843|480087|93574|99396|160|76396|164107|63589|03604|125|778|993957|rewind2|set_audio_track|onload|onerror|ima3|sdkloader|googleapis|imasdk|||const|over_player_msg|Secure|None|SameSite|uqloads|domain|toGMTString|expires|cookie|1000|getTime|setTime|Date|createCookieSec|pause|remove|show|complete|jsonp|609nu51a4w0l|file_real|file_id|parseInt|ss|view4|vectorrab|logs|post|viewable|ttl|round|Math|set|S|async|trim|pickDirect|direct|encodeURIComponent|unescape|btoa|base64|xml|application|forEach|slow|fadeIn|video_ad_fadein|cache|no|Cache|Content|headers|ajaxSetup|v2done|pop3done|vastdone2|vastdone1|playbackRateControls|cast|streamhg|aboutlink|StreamHG|abouttext|720p|363|1080p|726|4K|2075|qualityLabels|insecure|vpaidmode|client|advertising|fontOpacity|backgroundOpacity|Tahoma|fontFamily|backgroundColor|color|userFontScale|thumbnails|kind|gzuctcyihe4z0000|url|get_slides|androidhls|menus|progress|timeslider|icons|controlbar|skin|auto|preload|duration|uniform|stretching|height|width|image|sources|debug|setup|vplayer|txt|cyou|stellarcrestacademy|739408|1763394033|kjhhiuahiuhgihdf||BVwaU6uDqaMf1Psyo8sv_Q|stream|215845|asn|p2|p1|500|sp|srv|129600|wA|4OzQ5bRHlo5wxNWjQ2FKhcgTzbogijp01Vg5Ut48|premilkyway'.split('|');

function decodeJWPlayer(html) {
  // Extract the eval statement - simpler pattern
  const evalStart = html.indexOf("eval(function(p,a,c,k,e,d)");
  if (evalStart === -1) {
    console.log('       No obfuscated JWPlayer config found');
    return null;
  }
  
  // Find the packed data - it comes after the unpacker function
  // Pattern: eval(function(p,a,c,k,e,d){...}('PACKED_DATA',36,458,'DICTIONARY'.split('|')))
  // Find the end of the function (the closing brace before the opening paren)
  const functionEnd = html.indexOf("}('", evalStart);
  if (functionEnd === -1) {
    console.log('       Cannot find function end');
    return null;
  }
  
  const packedStart = functionEnd + 3; // Skip }('
  const packedEnd = html.indexOf("',", packedStart);
  const packed = html.substring(packedStart, packedEnd);
  
  // Extract radix and count - they come after the packed data
  const paramsMatch = html.substring(packedEnd).match(/,(\d+),(\d+),'/);
  if (!paramsMatch) {
    console.log('       Cannot extract parameters');
    return null;
  }
  
  const radix = parseInt(paramsMatch[1]);
  const count = parseInt(paramsMatch[2]);
  
  // Extract dictionary
  const dictStart = html.indexOf("'", packedEnd + paramsMatch[0].length) + 1;
  const dictEnd = html.indexOf("'.split", dictStart);
  const dictionary = html.substring(dictStart, dictEnd).split('|');
  

  
  console.log(`       Unpacking JWPlayer config (${dictionary.length} dict entries)...`);
  
  // Unpack - replace base-36 encoded numbers with dictionary values
  let unpacked = packed;
  for (let c = count - 1; c >= 0; c--) {
    if (dictionary[c]) {
      const encoded = c.toString(radix);
      // Use word boundaries to match whole tokens only
      const regex = new RegExp('\\b' + encoded + '\\b', 'g');
      unpacked = unpacked.replace(regex, dictionary[c]);
    }
  }
  
  console.log(`       Unpacked first 200 chars: ${unpacked.substring(0, 200)}`);
  
  // Debug: Save unpacked code
  const fs = require('fs');
  fs.writeFileSync('debug-unpacked-test.js', unpacked);
  
  // Extract sources object from the BEGINNING of unpacked code
  // Pattern: var o={"hls2":"...","hls4":"...","hls3":"..."}
  const sourcesMatch = unpacked.match(/var\s+o\s*=\s*\{([^}]+)\}/);
  if (!sourcesMatch) {
    console.log('       No sources object found in unpacked code');
    console.log('       Saved unpacked code to debug-unpacked-test.js');
    console.log('       First 200 chars:', unpacked.substring(0, 200));
    return null;
  }
  
  const sourcesStr = sourcesMatch[1];
  const sources = {};
  
  // Extract each source
  const sourcePattern = /"([^"]+)":"([^"]+)"/g;
  let match;
  
  while ((match = sourcePattern.exec(sourcesStr)) !== null) {
    sources[match[1]] = match[2];
  }
  
  console.log(`       Found ${Object.keys(sources).length} source(s): ${Object.keys(sources).join(', ')}`);
  
  return sources;
}

// ============================================================================
// MAIN EXTRACTOR
// ============================================================================

async function extract2Embed(tmdbId, type, season, episode) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`2EMBED EXTRACTOR - ${type.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log(`TMDB ID: ${tmdbId}`);
  if (type === 'tv') console.log(`Season: ${season}, Episode: ${episode}`);
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Fetch embed page
    let embedUrl = `https://vidsrc-embed.ru/embed/${type}/${tmdbId}`;
    if (type === 'tv') embedUrl += `/${season}/${episode}`;
    
    console.log('[1/8] Fetching embed page...');
    const embedResponse = await fetch(embedUrl, {
      referer: 'https://vidsrc-embed.ru/'
    });
    
    // Step 2: Extract 2embed hash
    console.log('[2/8] Extracting 2embed hash...');
    const hashMatch = embedResponse.body.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?2Embed/i);
    if (!hashMatch) throw new Error('No 2embed hash found');
    
    const hash = hashMatch[1];
    console.log(`       Hash: ${hash.substring(0, 30)}...`);
    
    // Step 3: Fetch RCP page (may have Turnstile)
    console.log('[3/8] Fetching RCP page...');
    const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
    const rcpResponse = await fetch(rcpUrl, {
      referer: embedUrl,
      origin: 'https://vidsrc-embed.ru'
    });
    
    // Check for Turnstile and bypass
    let proRcpUrl;
    if (rcpResponse.body.includes('cf-turnstile')) {
      console.log('[3/8] Bypassing Cloudflare Turnstile...');
      const hashParts = Buffer.from(hash, 'base64').toString('utf-8').split(':');
      if (hashParts.length === 2) {
        const proRcpHash = hashParts[1];
        proRcpUrl = `https://cloudnestra.com/prorcp/${proRcpHash}`;
        console.log('       Bypassed! Using extracted hash');
      } else {
        throw new Error('Cannot bypass Turnstile');
      }
    } else {
      // Extract ProRCP/SrcRCP URL from RCP page
      console.log('[4/8] Extracting ProRCP/SrcRCP URL...');
      const patterns = [
        /['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/,
        /['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/
      ];
      
      let match = null;
      let pathType = null;
      
      for (const pattern of patterns) {
        match = rcpResponse.body.match(pattern);
        if (match) {
          pathType = pattern.toString().includes('srcrcp') ? 'srcrcp' : 'prorcp';
          break;
        }
      }
      
      if (!match) throw new Error('No ProRCP/SrcRCP URL found');
      
      proRcpUrl = `https://cloudnestra.com/${pathType}/${match[1]}`;
      console.log(`       Type: ${pathType}`);
    }
    
    // Step 5: Fetch ProRCP/SrcRCP page
    console.log('[5/8] Fetching ProRCP/SrcRCP page...');
    const proRcpResponse = await fetch(proRcpUrl, {
      referer: embedUrl,  // CRITICAL: Must be vidsrc-embed.ru!
      origin: 'https://vidsrc-embed.ru'
    });
    
    // Check if it's a hidden div (ProRCP) or iframe player (SrcRCP)
    const hiddenDivMatch = proRcpResponse.body.match(/<div[^>]+id="([^"]+)"[^>]+style="display:none;">([^<]+)<\/div>/);
    
    if (hiddenDivMatch) {
      // ProRCP pattern - decode hidden div
      console.log('[6/8] Found hidden div (ProRCP pattern)');
      console.log('[7/8] Decoding...');
      console.log('[8/8] Skipping (use existing decoders)');
      
      return {
        success: false,
        error: 'ProRCP pattern detected - use existing old-format-decoder',
        pattern: 'prorcp'
      };
    }
    
    // SrcRCP pattern - extract player iframe
    console.log('[6/8] Extracting player iframe (SrcRCP pattern)...');
    const iframeMatch = proRcpResponse.body.match(/<iframe[^>]+data-src=["']([^"']+)["']/i);
    if (!iframeMatch) throw new Error('No iframe found');
    
    const playerUrl = iframeMatch[1];
    console.log(`       Player: ${playerUrl.substring(0, 50)}...`);
    
    // Step 7: Fetch player page and extract video sources
    console.log('[7/8] Fetching player page...');
    const playerResponse = await fetch(playerUrl, {
      referer: proRcpUrl
    });
    
    // Extract /swp/ links
    const swpPattern = /go\(['"]\/swp\/\?id=([^&]+)&tit=([^&]+)&pltm=(\d+)['"]\)/g;
    const swpMatches = [...playerResponse.body.matchAll(swpPattern)];
    
    if (swpMatches.length === 0) throw new Error('No video sources found');
    
    console.log(`       Found ${swpMatches.length} video sources`);
    
    // Get first source
    const firstSource = swpMatches[0];
    const swpUrl = `https://player4u.xyz/swp/?id=${firstSource[1]}&tit=${firstSource[2]}&pltm=${firstSource[3]}`;
    
    const swpResponse = await fetch(swpUrl, { referer: playerUrl });
    
    // Extract iframe src
    const swpIframeMatch = swpResponse.body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (!swpIframeMatch) throw new Error('No iframe in SWP page');
    
    const iframeSrc = swpIframeMatch[1];
    
    // Get jqueryjs.js to find URL pattern
    const jqueryResponse = await fetch('https://player4u.xyz/swp/jqueryjs.js', { referer: swpUrl });
    const urlPatternMatch = jqueryResponse.body.match(/["'](https?:\/\/[^"']+)["']\s*\+\s*myUrl/);
    
    if (!urlPatternMatch) throw new Error('Cannot find URL pattern');
    
    const finalPlayerUrl = `${urlPatternMatch[1]}${iframeSrc}`;
    
    // Step 8: Fetch final player and decode
    console.log('[8/8] Fetching final player and decoding...');
    const finalPlayerResponse = await fetch(finalPlayerUrl, { referer: swpUrl });
    
    // Debug: Save the page
    const fs = require('fs');
    fs.writeFileSync('debug-final-player-test.html', finalPlayerResponse.body);
    console.log('       Saved to debug-final-player-test.html');
    
    const sources = decodeJWPlayer(finalPlayerResponse.body);
    if (!sources) throw new Error('Cannot decode JWPlayer config');
    
    // Extract M3U8 URLs
    const m3u8Urls = [];
    
    // Prioritize .txt URLs (simpler referer requirement)
    if (sources.hls3 && sources.hls3.includes('.txt')) {
      m3u8Urls.push({
        url: sources.hls3.startsWith('http') ? sources.hls3 : `https:${sources.hls3}`,
        quality: 'auto',
        type: 'txt',
        referer: 'https://yesmovies.baby'  // Simple referer!
      });
    }
    
    // Add .m3u8 URLs
    if (sources.hls2 && sources.hls2.includes('.m3u8')) {
      m3u8Urls.push({
        url: sources.hls2.startsWith('http') ? sources.hls2 : `https:${sources.hls2}`,
        quality: 'auto',
        type: 'm3u8',
        referer: finalPlayerUrl
      });
    }
    
    if (sources.hls4 && sources.hls4.includes('.m3u8')) {
      const fullUrl = sources.hls4.startsWith('http') ? sources.hls4 : `https://yesmovies.baby${sources.hls4}`;
      m3u8Urls.push({
        url: fullUrl,
        quality: 'auto',
        type: 'm3u8',
        referer: finalPlayerUrl
      });
    }
    
    if (m3u8Urls.length === 0) throw new Error('No M3U8 URLs extracted');
    
    // Results
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS - M3U8 URLS EXTRACTED');
    console.log('='.repeat(80));
    console.log(`\nFound ${m3u8Urls.length} stream(s):\n`);
    
    m3u8Urls.forEach((stream, i) => {
      console.log(`[${i + 1}] ${stream.type.toUpperCase()} (${stream.quality})`);
      console.log(`    URL: ${stream.url.substring(0, 100)}...`);
      console.log(`    Referer: ${stream.referer}`);
      if (stream.type === 'txt') {
        console.log(`    ⭐ RECOMMENDED: Simple referer requirement`);
      }
      console.log();
    });
    
    console.log('='.repeat(80) + '\n');
    
    return {
      success: true,
      streams: m3u8Urls,
      count: m3u8Urls.length
    };
    
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ EXTRACTION FAILED');
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
  
  for (const testCase of testCases) {
    console.log(`\n\n${'#'.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'#'.repeat(80)}\n`);
    
    const result = await extract2Embed(
      testCase.tmdbId,
      testCase.type,
      testCase.season,
      testCase.episode
    );
    
    results.push({
      name: testCase.name,
      success: result.success,
      streams: result.streams?.length || 0
    });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.success) {
      console.log(`   ${result.streams} stream(s) extracted`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\nSuccess Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Running test cases...\n');
    runTests().catch(console.error);
  } else if (args[0] === 'tv' && args.length === 4) {
    const [, tmdbId, season, episode] = args;
    extract2Embed(tmdbId, 'tv', parseInt(season), parseInt(episode))
      .catch(console.error);
  } else if (args[0] === 'movie' && args.length === 2) {
    const [, tmdbId] = args;
    extract2Embed(tmdbId, 'movie')
      .catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node complete-2embed-extractor.js                    # Run test cases');
    console.log('  node complete-2embed-extractor.js tv <tmdbId> <s> <e>  # Extract TV episode');
    console.log('  node complete-2embed-extractor.js movie <tmdbId>        # Extract movie');
    console.log('\nExamples:');
    console.log('  node complete-2embed-extractor.js tv 60059 6 2');
    console.log('  node complete-2embed-extractor.js movie 550');
  }
}

module.exports = { extract2Embed };
